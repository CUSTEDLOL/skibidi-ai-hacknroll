"""
WebSocket server for the Classified Intel guessing game.
Handles room management, role assignment, and game flow with timers and leaderboards.
"""
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_cors import CORS
import os
import json
import random
import string
import time
import threading
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

# Import functions from app.py to avoid duplication
from app import (
    google_search,
    redact_with_gemini,
    get_random_topic_data,
    validate_query_logic,
    GOOGLE_API_KEY,
    GEMINI_API_KEY
)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


class Role(Enum):
    GUESSER = "guesser"
    SEARCHER = "searcher"
    HOST = "host"


@dataclass
class Player:
    """Represents a player in a room"""
    sid: str
    role: Optional[Role] = None
    name: Optional[str] = None
    score: int = 0  # Leaderboard score


@dataclass
class GameState:
    """Represents the state of a game room"""
    room_key: str
    players: Dict[str, Player] = field(default_factory=dict)
    host_sid: Optional[str] = None  # Host can control rounds/game end
    
    # Topic selection
    topic_options: List[Dict] = field(default_factory=list)  # List of {topic, forbidden_words}
    selected_topic: Optional[str] = None
    forbidden_words: List[str] = field(default_factory=list)
    
    # Search state
    search_queries: List[Dict] = field(default_factory=list)  # List of {query, results, redacted_terms, timestamp}
    selected_query_index: Optional[int] = None
    last_search_time: float = 0  # Timestamp of last search
    search_cooldown: int = 30  # Seconds between searches (default 30s)
    
    # Round state
    current_round: int = 0
    round_start_time: float = 0  # Timestamp when round started
    round_duration: int = 120  # Round duration in seconds (default 2 mins)
    game_active: bool = False
    round_active: bool = False
    
    # Guessing state
    guesses: List[Dict] = field(default_factory=list)  # List of {player_sid, guess, accepted, timestamp}
    correct_guessers: Set[str] = field(default_factory=set)  # SIDs of players who guessed correctly
    
    # Leaderboard
    leaderboard: List[Dict] = field(default_factory=list)  # List of {player_name, score, sid}


# Store all game rooms
rooms: Dict[str, GameState] = {}

# Store active timers
room_timers: Dict[str, threading.Timer] = {}


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


def update_leaderboard(room: GameState):
    """Update and broadcast leaderboard"""
    leaderboard = []
    for sid, player in room.players.items():
        leaderboard.append({
            'player_name': player.name or f'Player {sid[:6]}',
            'score': player.score,
            'sid': sid
        })
    
    # Sort by score (descending)
    leaderboard.sort(key=lambda x: x['score'], reverse=True)
    room.leaderboard = leaderboard
    
    # Broadcast to all players
    broadcast_to_room(room.room_key, 'leaderboard_update', {'leaderboard': leaderboard})


def check_round_end_conditions(room: GameState):
    """Check if round should end (all guessers correct or time expired)"""
    if not room.round_active:
        return
    
    guessers = [p for p in room.players.values() if p.role == Role.GUESSER]
    
    # Check if all guessers guessed correctly
    if len(guessers) > 0 and len(room.correct_guessers) == len(guessers):
        end_round(room, reason='all_correct')
        return
    
    # Check if time expired
    elapsed = time.time() - room.round_start_time
    if elapsed >= room.round_duration:
        end_round(room, reason='time_expired')


def end_round(room: GameState, reason: str = 'manual'):
    """End the current round"""
    if not room.round_active:
        return
    
    room.round_active = False
    room.game_active = False
    
    # Cancel any active timers
    if room.room_key in room_timers:
        room_timers[room.room_key].cancel()
        del room_timers[room.room_key]
    
    # Reset round-specific state
    room.search_queries = []
    room.selected_query_index = None
    room.correct_guessers = set()
    
    broadcast_to_room(room.room_key, 'round_ended', {
        'reason': reason,
        'current_round': room.current_round,
        'leaderboard': room.leaderboard
    })


def start_round_timer(room: GameState):
    """Start a timer for the round"""
    if room.room_key in room_timers:
        room_timers[room.room_key].cancel()
    
    def timer_callback():
        check_round_end_conditions(room)
    
    timer = threading.Timer(room.round_duration, timer_callback)
    timer.start()
    room_timers[room.room_key] = timer


def assign_roles_for_round(room: GameState):
    """Assign roles at the start of a round"""
    players_list = list(room.players.values())
    
    if len(players_list) < 2:
        return False
    
    # Randomly assign one searcher, rest are guessers
    random.shuffle(players_list)
    players_list[0].role = Role.SEARCHER
    
    for player in players_list[1:]:
        player.role = Role.GUESSER
    
    return True


def select_new_host(room: GameState, exclude_sid: Optional[str] = None):
    """Select a new host if current host disconnected"""
    available_players = [sid for sid, p in room.players.items() if sid != exclude_sid]
    
    if not available_players:
        return None
    
    # Select first available player as host
    new_host_sid = available_players[0]
    room.host_sid = new_host_sid
    
    if room.players[new_host_sid].role != Role.HOST:
        room.players[new_host_sid].role = Role.HOST
    
    broadcast_to_room(room.room_key, 'host_changed', {
        'new_host_sid': new_host_sid,
        'new_host_name': room.players[new_host_sid].name
    })
    
    return new_host_sid


def get_room_state_for_client(room: GameState, player_sid: str) -> dict:
    """Get the game state visible to a specific player"""
    player = room.players.get(player_sid)
    if not player:
        return {}
    
    state = {
        'room_key': room.room_key,
        'current_round': room.current_round,
        'round_active': room.round_active,
        'game_active': room.game_active,
        'is_host': room.host_sid == player_sid,
        'host_sid': room.host_sid,
        'players': [
            {
                'sid': sid,
                'role': p.role.value if p.role else None,
                'name': p.name,
                'score': p.score
            }
            for sid, p in room.players.items()
        ],
        'my_role': player.role.value if player.role else None,
        'leaderboard': room.leaderboard,
    }
    
    # Round timing info
    if room.round_active:
        elapsed = time.time() - room.round_start_time
        remaining = max(0, room.round_duration - elapsed)
        state['round_time_remaining'] = remaining
        state['round_duration'] = room.round_duration
    
    # Searcher-specific state
    if player.role == Role.SEARCHER:
        state['topic_options'] = room.topic_options
        state['selected_topic'] = room.selected_topic
        state['forbidden_words'] = room.forbidden_words
        state['search_queries'] = room.search_queries
        state['selected_query_index'] = room.selected_query_index
        
        # Search cooldown info
        if room.last_search_time > 0:
            time_since_search = time.time() - room.last_search_time
            cooldown_remaining = max(0, room.search_cooldown - time_since_search)
            state['search_cooldown_remaining'] = cooldown_remaining
        else:
            state['search_cooldown_remaining'] = 0
    
    # Guesser-specific state
    if player.role == Role.GUESSER:
        state['redacted_results'] = None
        if room.selected_query_index is not None and room.search_queries:
            selected_query = room.search_queries[room.selected_query_index]
            # Redacted results are already stored in the query
            if 'redacted_results' in selected_query:
                state['redacted_results'] = selected_query['redacted_results']
        state['has_guessed_correctly'] = player_sid in room.correct_guessers
    
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
            was_host = room.host_sid == request.sid
            leave_room(room_key)
            del room.players[request.sid]
            
            # If host disconnected, select new host
            if was_host:
                new_host = select_new_host(room, exclude_sid=request.sid)
                if not new_host:
                    # No players left, close room
                    if room.room_key in room_timers:
                        room_timers[room.room_key].cancel()
                        del room_timers[room.room_key]
                    del rooms[room_key]
                    continue
            
            # If searcher left during active round, end round
            if room.round_active and player.role == Role.SEARCHER:
                end_round(room, reason='searcher_left')
            
            # Notify other players
            broadcast_to_room(room_key, 'player_left', {
                'sid': request.sid,
                'role': player.role.value if player.role else None,
                'was_host': was_host
            })
            
            # Update leaderboard
            update_leaderboard(room)
            
            # Clean up empty rooms
            if len(room.players) == 0:
                if room.room_key in room_timers:
                    room_timers[room.room_key].cancel()
                    del room_timers[room.room_key]
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
    
    # Set first player as host if no host exists
    if room.host_sid is None:
        room.host_sid = request.sid
        player.role = Role.HOST
    
    print(f"Player {request.sid} joined room {room_key}")
    
    # Notify the player
    emit('joined_room', {
        'room_key': room_key,
        'is_host': room.host_sid == request.sid,
        'message': f'Joined room {room_key}'
    })
    
    # Notify other players
    broadcast_to_room(room_key, 'player_joined', {
        'sid': request.sid,
        'name': player_name,
        'is_host': room.host_sid == request.sid
    }, exclude_sid=request.sid)
    
    # Update leaderboard
    update_leaderboard(room)
    
    # Send current room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('searcher_get_topic_options')
def handle_searcher_get_topic_options(data: dict):
    """GET: Searcher gets list of n topics to pick from"""
    room_key = data.get('room_key', '').upper().strip()
    num_topics = data.get('num_topics', 3)  # Default to 3 topics
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player:
        emit('error', {'message': 'Not in this room'})
        return
    
    # Allow any player to get topic options before roles are assigned
    # The searcher role will be assigned when they select a topic
    if room.round_active:
        # If round is active, only searcher can get topics
        if player.role != Role.SEARCHER:
            emit('error', {'message': 'Only searcher can request topic options during an active round'})
            return
    
    # Generate n random topics
    topic_options = []
    for _ in range(num_topics):
        topic_data = get_random_topic_data()
        topic_options.append({
            'topic': topic_data.get('topic', ''),
            'forbidden_words': topic_data.get('forbidden_words', [])
        })
    
    room.topic_options = topic_options
    
    emit('topic_options', {
        'options': topic_options,
        'count': len(topic_options),
        'message': f'Generated {len(topic_options)} topic options'
    })


@socketio.on('searcher_select_topic')
def handle_searcher_select_topic(data: dict):
    """POST: Searcher picks the topic for that round"""
    room_key = data.get('room_key', '').upper().strip()
    topic_index = data.get('topic_index')
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player:
        emit('error', {'message': 'Not in this room'})
        return
    
    # If round is already active, only searcher can select topic
    if room.round_active:
        if player.role != Role.SEARCHER:
            emit('error', {'message': 'Only searcher can select topic during an active round'})
            return
    # If round is not active, allow any player to select topic (they become searcher)
    elif len(room.topic_options) == 0:
        emit('error', {'message': 'No topic options available. Request topic options first.'})
        return
    
    if topic_index is None or topic_index < 0 or topic_index >= len(room.topic_options):
        emit('error', {'message': 'Invalid topic index'})
        return
    
    selected_topic_data = room.topic_options[topic_index]
    room.selected_topic = selected_topic_data['topic']
    room.forbidden_words = selected_topic_data['forbidden_words']
    
    # Assign the player who selected the topic as searcher (if not already assigned)
    if not room.round_active:
        # Assign this player as searcher
        player.role = Role.SEARCHER
        # Assign other players as guessers
        for sid, p in room.players.items():
            if sid != request.sid and p.role != Role.HOST:
                p.role = Role.GUESSER
    
    # Start the round
    room.current_round += 1
    room.round_active = True
    room.game_active = True
    room.round_start_time = time.time()
    room.correct_guessers = set()
    room.search_queries = []
    room.selected_query_index = None
    room.last_search_time = 0
    
    # Start round timer
    start_round_timer(room)
    
    print(f"Searcher {request.sid} selected topic: {room.selected_topic} for round {room.current_round}")
    
    emit('topic_selected', {
        'topic': room.selected_topic,
        'forbidden_words': room.forbidden_words,
        'round': room.current_round,
        'message': 'Topic selected, round started'
    })
    
    # Notify all players that round has started
    broadcast_to_room(room_key, 'round_started', {
        'round': room.current_round,
        'round_duration': room.round_duration,
        'message': f'Round {room.current_round} has started!'
    })
    
    # Send updated room state to all players
    for sid in room.players:
        socketio.emit('room_state', get_room_state_for_client(room, sid), room=sid)


@socketio.on('searcher_make_search')
def handle_searcher_make_search(data: dict):
    """POST: Searcher submits a search query"""
    room_key = data.get('room_key', '').upper().strip()
    search_query = data.get('query', '').strip()
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player or player.role != Role.SEARCHER:
        emit('error', {'message': 'Only searcher can make searches'})
        return
    
    if not room.round_active:
        emit('error', {'message': 'Round is not active'})
        return
    
    if not search_query:
        emit('error', {'message': 'Search query is required'})
        return
    
    # Check search cooldown
    current_time = time.time()
    if room.last_search_time > 0:
        time_since_search = current_time - room.last_search_time
        if time_since_search < room.search_cooldown:
            remaining = room.search_cooldown - time_since_search
            emit('error', {
                'message': f'Search cooldown active. Wait {remaining:.1f} more seconds.',
                'cooldown_remaining': remaining
            })
            return
    
    # Validate query doesn't contain forbidden words
    validation_result = validate_query_logic(search_query, room.forbidden_words)
    
    if not validation_result['valid']:
        emit('search_result', {
            'query': search_query,
            'results': [],
            'redacted_terms': [],
            'valid': False,
            'violations': validation_result['violations'],
            'message': validation_result['message']
        })
        return
    
    # Perform search
    try:
        results = google_search(search_query, num_results=5)
        
        # Generate redacted version for guessers
        redacted_results = redact_with_gemini(
            results,
            room.forbidden_words,
            search_query,
            room.selected_topic
        )
        
        # Extract redacted terms (words that were replaced with [REDACTED])
        # This is a simplified approach - in practice, you might want to track this during redaction
        redacted_terms = room.forbidden_words.copy()
        redacted_terms.extend(search_query.lower().split())
        
        # Store the search query and results
        search_entry = {
            'query': search_query,
            'results': results,  # Original results for searcher
            'redacted_results': {  # Redacted results for guessers
                'query': '[REDACTED]',
                'results': redacted_results,
                'count': len(redacted_results)
            },
            'redacted_terms': redacted_terms,
            'timestamp': len(room.search_queries),
            'time': current_time
        }
        room.search_queries.append(search_entry)
        room.last_search_time = current_time
        
        print(f"Searcher {request.sid} made search: {search_query} ({len(results)} results)")
        
        # Return results AND redacted terms to searcher
        emit('search_result', {
            'query': search_query,
            'results': results,
            'redacted_terms': redacted_terms,
            'redacted_results_preview': {
                'query': '[REDACTED]',
                'results': redacted_results,
                'count': len(redacted_results)
            },
            'count': len(results),
            'valid': True,
            'query_index': len(room.search_queries) - 1,
            'message': f'Search completed: {len(results)} results. Redacted version ready for guessers.'
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
    
    # Notify searcher
    emit('query_selected', {
        'query_index': query_index,
        'message': 'Query selected and sent to guessers'
    })
    
    # GET: Send redacted results to all guessers automatically
    guesser_data = {
        'redacted_results': selected_query['redacted_results'],
        'message': 'New search results available'
    }
    
    for sid, p in room.players.items():
        if p.role == Role.GUESSER:
            socketio.emit('search_results_for_guesser', guesser_data, room=sid)
    
    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('guesser_make_guess')
def handle_guesser_make_guess(data: dict):
    """POST: Guesser makes a guess"""
    room_key = data.get('room_key', '').upper().strip()
    guess = data.get('guess', '').strip()
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player or player.role != Role.GUESSER:
        emit('error', {'message': 'Only guessers can make guesses'})
        return
    
    if not room.round_active:
        emit('error', {'message': 'Round is not active'})
        return
    
    if not guess:
        emit('error', {'message': 'Guess is required'})
        return
    
    if not room.selected_topic:
        emit('error', {'message': 'No topic selected yet'})
        return
    
    # Check if already guessed correctly
    if request.sid in room.correct_guessers:
        emit('error', {'message': 'You have already guessed correctly this round'})
        return
    
    # Check if guess is correct (case-insensitive, fuzzy matching)
    guess_lower = guess.lower().strip()
    secret_lower = room.selected_topic.lower().strip()
    
    # Enhanced matching: exact match, contains match, or fuzzy match
    is_correct = (
        guess_lower == secret_lower or
        guess_lower in secret_lower or
        secret_lower in guess_lower or
        # Remove common words and compare
        guess_lower.replace('the ', '').replace('a ', '').replace('an ', '') == 
        secret_lower.replace('the ', '').replace('a ', '').replace('an ', '')
    )
    
    # Store the guess
    guess_entry = {
        'player_sid': request.sid,
        'player_name': player.name,
        'guess': guess,
        'accepted': is_correct,
        'timestamp': time.time()
    }
    room.guesses.append(guess_entry)
    
    print(f"Guesser {request.sid} made guess: {guess} (correct: {is_correct})")
    
    # If correct, add to correct guessers and award points
    points_earned = 0
    if is_correct:
        room.correct_guessers.add(request.sid)
        # Award points based on time remaining (more points for faster guesses)
        if room.round_active:
            elapsed = time.time() - room.round_start_time
            time_remaining = max(0, room.round_duration - elapsed)
            points_earned = int(100 * (time_remaining / room.round_duration)) + 50  # Base 50 + time bonus
            player.score += points_earned
    
    # Notify the guesser
    emit('guess_result', {
        'guess': guess,
        'accepted': is_correct,
        'points_earned': points_earned,
        'total_score': player.score,
        'message': f'Correct! +{points_earned} points (Total: {player.score})' if is_correct else 'Incorrect, try again'
    })
    
    # Notify searcher about the guess
    searcher_sid = next((sid for sid, p in room.players.items() if p.role == Role.SEARCHER), None)
    if searcher_sid:
        socketio.emit('guesser_guessed', {
            'player_name': player.name,
            'guess': guess,
            'accepted': is_correct
        }, room=searcher_sid)
    
    # Update leaderboard
    update_leaderboard(room)
    
    # Check if round should end (all guessers correct)
    check_round_end_conditions(room)
    
    # Send updated room state
    emit('room_state', get_room_state_for_client(room, request.sid))


@socketio.on('host_next_round')
def handle_host_next_round(data: dict):
    """POST: Host decides to move to next round"""
    room_key = data.get('room_key', '').upper().strip()
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player:
        emit('error', {'message': 'Not in this room'})
        return
    
    if room.host_sid != request.sid:
        emit('error', {'message': 'Only host can start next round'})
        return
    
    # End current round if active
    if room.round_active:
        end_round(room, reason='host_next_round')
    
    # Reset round state (topic selection will start new round)
    room.selected_topic = None
    room.forbidden_words = []
    room.topic_options = []
    room.search_queries = []
    room.selected_query_index = None
    room.correct_guessers = set()
    
    broadcast_to_room(room_key, 'next_round_preparing', {
        'message': 'Host is preparing next round',
        'current_round': room.current_round
    })
    
    # Send updated room state to all players
    for sid in room.players:
        socketio.emit('room_state', get_room_state_for_client(room, sid), room=sid)


@socketio.on('host_end_game')
def handle_host_end_game(data: dict):
    """POST: Host decides to end the game - ends websocket connection for all"""
    room_key = data.get('room_key', '').upper().strip()
    
    room = get_room(room_key)
    player = get_player_in_room(room_key, request.sid)
    
    if not player:
        emit('error', {'message': 'Not in this room'})
        return
    
    if room.host_sid != request.sid:
        emit('error', {'message': 'Only host can end the game'})
        return
    
    # End current round if active
    if room.round_active:
        end_round(room, reason='game_ended')
    
    # Send final leaderboard
    final_leaderboard = room.leaderboard.copy()
    
    # Notify all players game is ending
    broadcast_to_room(room_key, 'game_ending', {
        'message': 'Game is ending',
        'final_leaderboard': final_leaderboard,
        'total_rounds': room.current_round
    })
    
    # Disconnect all players after a short delay
    def disconnect_all():
        for sid in list(room.players.keys()):
            socketio.emit('game_ended', {
                'message': 'Game has ended',
                'final_leaderboard': final_leaderboard
            }, room=sid)
            disconnect(sid)
        
        # Clean up room
        if room.room_key in room_timers:
            room_timers[room.room_key].cancel()
            del room_timers[room.room_key]
        if room_key in rooms:
            del rooms[room_key]
    
    # Give clients 2 seconds to receive the message before disconnecting
    threading.Timer(2.0, disconnect_all).start()


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
