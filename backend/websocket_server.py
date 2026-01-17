"""
WebSocket server for the Classified Intel guessing game.
Handles room management, role assignment, and game flow.
"""
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_cors import CORS
import os
import json
import random
import string
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

# Import shared utility functions
from search_utils import (
    google_search,
    redact_with_gemini,
    get_random_topic_data,
    validate_query_logic,
    GOOGLE_API_KEY,
    GEMINI_API_KEY
)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get(
    'SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


class Role(Enum):
    GUESSER = "guesser"
    SEARCHER = "searcher"


@dataclass
class Player:
    """Represents a player in a room"""
    sid: str
    role: Optional[Role] = None
    name: Optional[str] = None


@dataclass
class GameState:
    """Represents the state of a game room"""
    room_key: str
    players: Dict[str, Player] = field(default_factory=dict)
    secret_topic: Optional[str] = None
    forbidden_words: List[str] = field(default_factory=list)
    secret_word_options: List[str] = field(default_factory=list)
    selected_secret_word: Optional[str] = None
    searcher_sid: Optional[str] = None
    # List of {query, results, timestamp}
    search_queries: List[Dict] = field(default_factory=list)
    selected_query_index: Optional[int] = None
    current_round: int = 1
    game_active: bool = False
    # List of {player_sid, guess, accepted, timestamp}
    guesses: List[Dict] = field(default_factory=list)


# Store all game rooms
rooms: Dict[str, GameState] = {}


def generate_room_key(length: int = 6) -> str:
    """Generate a random room key"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def get_room(room_key: str) -> Optional[GameState]:
    """Get a room by key, creating it if it doesn't exist"""
    if room_key not in rooms:
        rooms[room_key] = GameState(room_key=room_key)
    return rooms[room_key]


def get_player_in_room(room_key: str, sid: str) -> Optional[Player]:
    """Get a player from a room"""
    room = get_room(room_key)
    return room.players.get(sid)


def broadcast_to_room(room_key: str, event: str, data: dict, exclude_sid: Optional[str] = None):
    """Broadcast an event to all players in a room"""
    socketio.emit(event, data, room=room_key, skip_sid=exclude_sid)


def get_room_state_for_client(room: GameState, player_sid: str) -> dict:
    """Get the game state visible to a specific player"""
    player = room.players.get(player_sid)
    if not player:
        return {}

    state = {
        'room_key': room.room_key,
        'current_round': room.current_round,
        'game_active': room.game_active,
        'players': [
            {
                'sid': sid,
                'role': p.role.value if p.role else None,
                'name': p.name
            }
            for sid, p in room.players.items()
        ],
        'my_role': player.role.value if player.role else None,
    }

    # Searcher-specific state
    if player.role == Role.SEARCHER:
        state['secret_topic'] = room.secret_topic
        state['forbidden_words'] = room.forbidden_words
        state['secret_word_options'] = room.secret_word_options
        state['selected_secret_word'] = room.selected_secret_word
        state['search_queries'] = room.search_queries
        state['selected_query_index'] = room.selected_query_index

    # Guesser-specific state
    if player.role == Role.GUESSER:
        state['redacted_results'] = None
        if room.selected_query_index is not None and room.search_queries:
            selected_query = room.search_queries[room.selected_query_index]
            # Redact results for guessers
            if 'results' in selected_query and room.secret_topic and room.forbidden_words:
                redacted = redact_with_gemini(
                    selected_query['results'],
                    room.forbidden_words,
                    selected_query['query'],
                    room.secret_topic
                )
                state['redacted_results'] = {
                    'query': '[REDACTED]',
                    'results': redacted,
                    'count': len(redacted)
                }

    return state


@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to server', 'sid': request.sid})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")
    # Remove player from all rooms
    for room_key, room in list(rooms.items()):
        if request.sid in room.players:
            player = room.players[request.sid]
            leave_room(room_key)
            del room.players[request.sid]

            # If searcher left, clear searcher
            if room.searcher_sid == request.sid:
                room.searcher_sid = None
                room.game_active = False

            # Notify other players
            broadcast_to_room(room_key, 'player_left', {
                'sid': request.sid,
                'role': player.role.value if player.role else None
            })

            # Clean up empty rooms
            if len(room.players) == 0:
                del rooms[room_key]


@socketio.on('join_room')
def handle_join_room(data: dict):
    """Join a room with a room key"""
    room_key = data.get('room_key', '').upper().strip()
    player_name = data.get('name', 'Anonymous')

    if not room_key:
        emit('error', {'message': 'Room key is required'})
        return

    room = get_room(room_key)

    # Check if player already in room
    if request.sid in room.players:
        emit('error', {'message': 'Already in this room'})
        return

    # Add player to room
    player = Player(sid=request.sid, name=player_name)
    room.players[request.sid] = player
    join_room(room_key)

    print(f"Player {request.sid} joined room {room_key}")

    # Notify the player
    emit('joined_room', {
        'room_key': room_key,
        'message': f'Joined room {room_key}'
    })

    # Notify other players
    broadcast_to_room(room_key, 'player_joined', {
        'sid': request.sid,
        'name': player_name
    }, exclude_sid=request.sid)

    # Send current room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('pick_role')
def handle_pick_role(data: dict):
    """Pick a role: 'guesser', 'searcher', or 'random'"""
    room_key = data.get('room_key', '').upper().strip()
    role_choice = data.get('role', 'random').lower()

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player:
        emit('error', {'message': 'Not in this room'})
        return

    # Check if searcher role is already taken
    if role_choice == 'searcher' and room.searcher_sid and room.searcher_sid != request.sid:
        emit('error', {'message': 'Searcher role is already taken'})
        return

    # Assign role
    if role_choice == 'random':
        # Randomly assign, but only searcher if no one else is searcher
        if room.searcher_sid is None:
            player.role = random.choice([Role.GUESSER, Role.SEARCHER])
        else:
            player.role = Role.GUESSER
    elif role_choice == 'searcher':
        player.role = Role.SEARCHER
        room.searcher_sid = request.sid
    elif role_choice == 'guesser':
        player.role = Role.GUESSER
    else:
        emit(
            'error', {'message': 'Invalid role. Must be guesser, searcher, or random'})
        return

    print(f"Player {request.sid} picked role: {player.role.value}")

    # Notify the player
    emit('role_assigned', {
        'role': player.role.value,
        'message': f'Assigned role: {player.role.value}'
    })

    # Notify all players in room
    broadcast_to_room(room_key, 'player_role_changed', {
        'sid': request.sid,
        'role': player.role.value
    })

    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('searcher_get_secret_word_options')
def handle_searcher_get_secret_word_options(data: dict):
    """Give the searcher secret word options to pick from"""
    room_key = data.get('room_key', '').upper().strip()

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player or player.role != Role.SEARCHER:
        emit(
            'error', {'message': 'Only searcher can request secret word options'})
        return

    # Get random topic
    topic_data = get_random_topic_data()
    room.secret_topic = topic_data.get('topic', '')
    room.forbidden_words = topic_data.get('forbidden_words', [])

    # Generate 3-5 secret word options (for now, just use the topic)
    # In a real implementation, you might want to generate variations
    room.secret_word_options = [
        room.secret_topic,
        f"{room.secret_topic} (variant 1)",
        f"{room.secret_topic} (variant 2)"
    ]

    emit('secret_word_options', {
        'options': room.secret_word_options,
        'message': 'Secret word options generated'
    })


@socketio.on('searcher_select_secret_word')
def handle_searcher_select_secret_word(data: dict):
    """Searcher selects which secret word to use"""
    room_key = data.get('room_key', '').upper().strip()
    selected_word = data.get('selected_word', '')

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player or player.role != Role.SEARCHER:
        emit('error', {'message': 'Only searcher can select secret word'})
        return

    if selected_word not in room.secret_word_options:
        emit('error', {'message': 'Invalid secret word selection'})
        return

    room.selected_secret_word = selected_word
    room.secret_topic = selected_word  # Update the secret topic
    room.game_active = True

    print(f"Searcher {request.sid} selected secret word: {selected_word}")

    emit('secret_word_selected', {
        'selected_word': selected_word,
        'forbidden_words': room.forbidden_words,
        'message': 'Secret word selected, game can begin'
    })

    # Notify guessers that game has started
    broadcast_to_room(room_key, 'game_started', {
        'message': 'Game has started'
    }, exclude_sid=request.sid)

    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('searcher_make_search')
def handle_searcher_make_search(data: dict):
    """Searcher makes a search query"""
    room_key = data.get('room_key', '').upper().strip()
    search_query = data.get('query', '').strip()

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player or player.role != Role.SEARCHER:
        emit('error', {'message': 'Only searcher can make searches'})
        return

    if not room.game_active:
        emit('error', {'message': 'Game is not active'})
        return

    if not search_query:
        emit('error', {'message': 'Search query is required'})
        return

    # Validate query doesn't contain forbidden words using shared logic
    validation_result = validate_query_logic(
        search_query, room.forbidden_words)

    if not validation_result['valid']:
        emit('search_result', {
            'query': search_query,
            'results': [],
            'valid': False,
            'violations': validation_result['violations'],
            'message': validation_result['message']
        })
        return

    # Perform search using the existing search function
    try:
        results = google_search(search_query, num_results=5)

        # Store the search query and results
        search_entry = {
            'query': search_query,
            'results': results,
            'timestamp': len(room.search_queries)
        }
        room.search_queries.append(search_entry)

        print(
            f"Searcher {request.sid} made search: {search_query} ({len(results)} results)")

        emit('search_result', {
            'query': search_query,
            'results': results,
            'count': len(results),
            'valid': True,
            'query_index': len(room.search_queries) - 1,
            'message': f'Search completed: {len(results)} results'
        })

    except Exception as e:
        print(f"Search error: {e}")
        emit('error', {'message': f'Search failed: {str(e)}'})


@socketio.on('searcher_select_query')
def handle_searcher_select_query(data: dict):
    """Searcher selects which query result to send to guessers"""
    room_key = data.get('room_key', '').upper().strip()
    query_index = data.get('query_index')

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player or player.role != Role.SEARCHER:
        emit('error', {'message': 'Only searcher can select query'})
        return

    if query_index is None or query_index < 0 or query_index >= len(room.search_queries):
        emit('error', {'message': 'Invalid query index'})
        return

    room.selected_query_index = query_index
    selected_query = room.search_queries[query_index]

    print(f"Searcher {request.sid} selected query index {query_index}")

    # Redact results for guessers
    redacted_results = redact_with_gemini(
        selected_query['results'],
        room.forbidden_words,
        selected_query['query'],
        room.secret_topic
    )

    # Notify searcher
    emit('query_selected', {
        'query_index': query_index,
        'message': 'Query selected and sent to guessers'
    })

    # Send redacted results to all guessers
    guesser_data = {
        'redacted_results': {
            'query': '[REDACTED]',
            'results': redacted_results,
            'count': len(redacted_results)
        },
        'message': 'New search results available'
    }

    for sid, p in room.players.items():
        if p.role == Role.GUESSER:
            socketio.emit('search_results_for_guesser', guesser_data, room=sid)

    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('guesser_make_guess')
def handle_guesser_make_guess(data: dict):
    """Guesser makes a guess"""
    room_key = data.get('room_key', '').upper().strip()
    guess = data.get('guess', '').strip()

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player or player.role != Role.GUESSER:
        emit('error', {'message': 'Only guessers can make guesses'})
        return

    if not room.game_active:
        emit('error', {'message': 'Game is not active'})
        return

    if not guess:
        emit('error', {'message': 'Guess is required'})
        return

    if not room.selected_secret_word:
        emit('error', {'message': 'No secret word selected yet'})
        return

    # Check if guess is correct (case-insensitive, partial match)
    guess_lower = guess.lower()
    secret_lower = room.selected_secret_word.lower()

    # Simple matching - can be enhanced with fuzzy matching
    is_correct = guess_lower == secret_lower or guess_lower in secret_lower or secret_lower in guess_lower

    # Store the guess
    guess_entry = {
        'player_sid': request.sid,
        'player_name': player.name,
        'guess': guess,
        'accepted': is_correct,
        'timestamp': len(room.guesses)
    }
    room.guesses.append(guess_entry)

    print(f"Guesser {request.sid} made guess: {guess} (correct: {is_correct})")

    # Notify the guesser
    emit('guess_result', {
        'guess': guess,
        'accepted': is_correct,
        'message': 'Correct!' if is_correct else 'Incorrect, try again'
    })

    # Notify searcher about the guess
    if room.searcher_sid:
        socketio.emit('guesser_guessed', {
            'player_name': player.name,
            'guess': guess,
            'accepted': is_correct
        }, room=room.searcher_sid)

    # If correct, notify all players
    if is_correct:
        broadcast_to_room(room_key, 'correct_guess', {
            'player_name': player.name,
            'guess': guess,
            'message': f'{player.name} guessed correctly!'
        })

    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('end_game')
def handle_end_game(data: dict):
    """End the game or continue to next round"""
    room_key = data.get('room_key', '').upper().strip()
    action = data.get('action', 'end')  # 'end' or 'continue'

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player:
        emit('error', {'message': 'Not in this room'})
        return

    # Only searcher or any player can end the game
    if action == 'end':
        room.game_active = False
        room.current_round = 1
        room.secret_topic = None
        room.forbidden_words = []
        room.secret_word_options = []
        room.selected_secret_word = None
        room.search_queries = []
        room.selected_query_index = None
        room.guesses = []

        print(f"Game ended in room {room_key}")

        broadcast_to_room(room_key, 'game_ended', {
            'message': 'Game has ended',
            'final_round': room.current_round
        })

    elif action == 'continue':
        # Continue to next round
        room.current_round += 1
        room.secret_topic = None
        room.forbidden_words = []
        room.secret_word_options = []
        room.selected_secret_word = None
        room.search_queries = []
        room.selected_query_index = None
        room.guesses = []
        room.game_active = False  # Will be set to True when searcher selects new word

        print(f"Continuing to round {room.current_round} in room {room_key}")

        broadcast_to_room(room_key, 'round_continued', {
            'message': f'Continuing to round {room.current_round}',
            'current_round': room.current_round
        })

    # Send updated room state to all players
    for sid in room.players:
        socketio.emit('room_state', get_room_state_for_client(
            room, sid), room=sid)


@socketio.on('get_room_state')
def handle_get_room_state(data: dict):
    """Get current room state"""
    room_key = data.get('room_key', '').upper().strip()

    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)

    if not player:
        emit('error', {'message': 'Not in this room'})
        return

    emit('room_state', get_room_state_for_client(room, request.sid))


if __name__ == '__main__':
    print("Starting WebSocket server...")
    print(f"Google API Key configured: {bool(GOOGLE_API_KEY)}")
    print(f"Gemini API Key configured: {bool(GEMINI_API_KEY)}")
    socketio.run(app, debug=True, port=5001, allow_unsafe_werkzeug=True)
