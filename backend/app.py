import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import string
import random
import logging
from datetime import datetime
from flask_socketio import SocketIO, join_room, leave_room, emit
from typing import List
import time
import threading

# Import shared utility functions
from search_utils import (
    google_search,
    redact_with_gemini,
    simple_redaction,
    validate_query_logic,
    verify_guess_with_gemini,
    get_random_topic_data,
    GOOGLE_API_KEY,
    GEMINI_API_KEY,
    GOOGLE_SEARCH_AVAILABLE,
    GEMINI_AVAILABLE
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(
    filename='app.log',
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
)

# Redirect stdout to log file (capture any remaining print() statements)
sys.stdout = open('app.log', 'a', buffering=1)
sys.stderr = open('app.log', 'a', buffering=1)

# ============ In-Memory Storage (replace with database later) ============
lobbies = {}  # Store active lobbies
players = {}  # Store player sessions
user_socket_map = {}     # userId -> sid
socket_user_map = {}     # sid -> userId

# Map lobbyCode to lobbyId for quick lookup
lobby_code_map = {}

# Track active timer threads
active_timer_threads = {}

# Helper to generate a 6-char alphanumeric code (upper/lowercase + numbers)


def generate_lobby_code(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

# Helper to generate a unique user ID for a room


def generate_user_id(lobby_id):
    """Generate a unique user ID that's unique within the lobby"""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    while True:
        user_id = 'AGENT_' + ''.join(random.choices(chars, k=4))
        # Check if user_id is unique in this lobby
        lobby = lobbies.get(lobby_id)
        if lobby:
            existing_ids = {p['playerId'] for p in lobby['players']}
            if user_id not in existing_ids:
                return user_id
        else:
            return user_id

# Helper for socket connections


def emit_lobby_state(lobby_id):
    lobby = lobbies.get(lobby_id)
    if not lobby:
        return
    # Broadcast to everyone in the lobby room
    socketio.emit("lobby:state", {"lobby": lobby}, room=lobby_id)


def get_current_round_time_remaining(round_state):
    """Calculate time remaining in current round"""
    if not round_state or not round_state.get('startTime'):
        return 0

    elapsed = time.time() - round_state['startTime']
    remaining = round_state['timeLimit'] - elapsed
    return max(0, int(remaining))


def get_cooldown_remaining(round_state):
    """Calculate cooldown remaining for next result send"""
    if not round_state or not round_state.get('lastResultSentAt'):
        return 0

    elapsed = time.time() - round_state['lastResultSentAt']
    remaining = round_state['resultCooldown'] - elapsed
    return max(0, int(remaining))


def timer_broadcast_thread(lobby_id):
    """Background thread that broadcasts timer updates every second"""
    print(f"[Timer] Started timer thread for lobby {lobby_id}")

    while lobby_id in lobbies:
        lobby = lobbies.get(lobby_id)
        if not lobby or not lobby.get('roundState'):
            break

        round_state = lobby['roundState']
        if not round_state.get('isActive'):
            break

        time_remaining = get_current_round_time_remaining(round_state)
        cooldown_remaining = get_cooldown_remaining(round_state)

        # Broadcast timer sync
        socketio.emit('round:timer_sync', {
            'timeRemaining': time_remaining,
            'cooldownRemaining': cooldown_remaining,
            'roundNumber': round_state.get('roundNumber', 1)
        }, room=lobby_id)

        # Check if round should end
        if time_remaining <= 0:
            round_state['isActive'] = False
            socketio.emit('round:ended', {
                'reason': 'time_expired',
                'roundNumber': round_state.get('roundNumber', 1)
            }, room=lobby_id)
            print(f"[Timer] Round ended for lobby {lobby_id}")
            break

        time.sleep(1)

    # Clean up thread reference
    if lobby_id in active_timer_threads:
        del active_timer_threads[lobby_id]

    print(f"[Timer] Timer thread stopped for lobby {lobby_id}")


# socket event handlers


@socketio.on("connect")
def on_connect():
    app.logger.info(f"Socket connected: {request.sid}")


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    user_id = socket_user_map.get(sid)

    # Clean up socket mappings
    if user_id:
        user_socket_map.pop(user_id, None)
        socket_user_map.pop(sid, None)

        # Handle player disconnect based on lobby state
        for lobby_id, lobby in list(lobbies.items()):
            player_found = False
            for i, player in enumerate(lobby['players']):
                if player['playerId'] == user_id:
                    player_name = player['playerName']
                    player_found = True

                    # Differentiate between lobby (waiting) and in-game disconnect
                    if lobby['status'] == 'waiting':
                        # In lobby: remove player entirely
                        lobby['players'].pop(i)
                        app.logger.info(
                            f"Player {player_name} ({user_id}) left lobby {lobby_id}")

                        # Check if any players remain
                        if len(lobby['players']) > 0:
                            emit_lobby_state(lobby_id)
                            socketio.emit("lobby:player_left", {
                                "playerId": user_id,
                                "playerName": player_name,
                                "message": f"{player_name} has left the lobby"
                            }, room=lobby_id)
                        else:
                            # No players left, clean up the lobby
                            lobby_code = lobby['lobbyCode']
                            del lobbies[lobby_id]
                            lobby_code_map.pop(lobby_code, None)
                            app.logger.info(
                                f"Lobby {lobby_id} cleaned up (no players remaining)")

                    elif lobby['status'] == 'in_game':
                        # During game: mark as disconnected but keep in player list
                        player['isConnected'] = False
                        app.logger.info(
                            f"Player {player_name} ({user_id}) disconnected during game in lobby {lobby_id}")

                        emit_lobby_state(lobby_id)
                        socketio.emit("lobby:player_disconnected", {
                            "playerId": user_id,
                            "playerName": player_name,
                            "message": f"{player_name} has disconnected"
                        }, room=lobby_id)

                    break

            if player_found:
                break

    app.logger.info(f"Socket disconnected: {sid}")


@socketio.on("lobby:join")
def on_lobby_join(data):
    """
    Client subscribes to lobby realtime updates.
    Requires: lobbyId + userId
    """
    lobby_id = data.get("lobbyId")
    user_id = data.get("userId")

    if not lobby_id or not user_id:
        emit("error", {"error": "Missing lobbyId or userId"})
        return

    if lobby_id not in lobbies:
        emit("error", {"error": "Lobby not found"})
        return

    # Track sockets for private messages
    user_socket_map[user_id] = request.sid
    socket_user_map[request.sid] = user_id

    # Join the lobby room
    join_room(lobby_id)

    # Check if player exists in lobby and mark as connected
    lobby = lobbies[lobby_id]
    player_found = False
    player_name = None

    for player in lobby['players']:
        if player['playerId'] == user_id:
            player['isConnected'] = True
            player_name = player['playerName']
            player_found = True
            app.logger.info(
                f"Player {player_name} ({user_id}) connected to lobby {lobby_id}")
            break

    # Send current state to just this socket
    emit("lobby:state", {"lobby": lobbies[lobby_id]})

    # Send chat history
    emit("chat:history", {
         "messages": lobbies[lobby_id].get('chatHistory', [])})

    # Broadcast updated state to everyone in the lobby
    emit_lobby_state(lobby_id)

    # Notify others if this is a reconnection or existing player connecting
    if player_found and player_name:
        socketio.emit("lobby:player_joined", {
            "playerId": user_id,
            "playerName": player_name,
            "message": f"{player_name} connected to the lobby"
        }, room=lobby_id, skip_sid=request.sid)


@socketio.on("lobby:leave")
def on_lobby_leave(data):
    """
    Client explicitly leaves the lobby (e.g., clicking Leave button)
    """
    lobby_id = data.get("lobbyId")
    if not lobby_id:
        return

    sid = request.sid
    user_id = socket_user_map.get(sid)

    if user_id and lobby_id in lobbies:
        lobby = lobbies[lobby_id]

        # Find and remove the player
        for i, player in enumerate(lobby['players']):
            if player['playerId'] == user_id:
                player_name = player['playerName']

                # Only remove player if lobby is in waiting state
                if lobby['status'] == 'waiting':
                    lobby['players'].pop(i)
                    app.logger.info(
                        f"Player {player_name} ({user_id}) left lobby {lobby_id}")

                    # Broadcast updated state
                    if len(lobby['players']) > 0:
                        emit_lobby_state(lobby_id)
                        socketio.emit("lobby:player_left", {
                            "playerId": user_id,
                            "playerName": player_name,
                            "message": f"{player_name} has left the lobby"
                        }, room=lobby_id)
                    else:
                        # Clean up empty lobby
                        lobby_code = lobby['lobbyCode']
                        del lobbies[lobby_id]
                        lobby_code_map.pop(lobby_code, None)
                        app.logger.info(
                            f"Lobby {lobby_id} cleaned up (no players remaining)")
                else:
                    # During game, just mark as disconnected
                    player['isConnected'] = False
                    emit_lobby_state(lobby_id)
                    socketio.emit("lobby:player_disconnected", {
                        "playerId": user_id,
                        "playerName": player_name,
                        "message": f"{player_name} has left"
                    }, room=lobby_id)

                break

        # Clean up socket mappings
        user_socket_map.pop(user_id, None)
        socket_user_map.pop(sid, None)

    leave_room(lobby_id)


# Debug ping/pong handlers for frontend socket testing
@socketio.on("ping")
def handle_ping(data):
    app.logger.debug(f"[SocketIO] Received ping from frontend: {data}")
    emit("pong", {"msg": "pong from backend", "time": data.get("time")})
    emit("debug", "Ping event received and pong sent.")


@socketio.on("chat:message")
def handle_chat_message(data):
    """Handle chat messages and persist them"""
    lobby_id = data.get("lobbyId")
    message = data.get("message")
    player_id = data.get("playerId")

    if not all([lobby_id, message, player_id]) or lobby_id not in lobbies:
        return

    lobby = lobbies[lobby_id]

    # Create message object
    chat_msg = {
        "id": str(uuid.uuid4()),
        "playerId": player_id,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }

    # Store in history
    if 'chatHistory' not in lobby:
        lobby['chatHistory'] = []
    lobby['chatHistory'].append(chat_msg)

    # Broadcast to lobby
    socketio.emit("chat:message", chat_msg, room=lobby_id)


@socketio.on("emote:send")
def handle_emote(data):
    """Handle emotes/reactions"""
    lobby_id = data.get("lobbyId")
    if not lobby_id or lobby_id not in lobbies:
        return

    # Broadcast emote to lobby (no persistence needed for emotes usually)
    socketio.emit("emote:receive", data, room=lobby_id)


# ============ Game WebSocket Handlers ============

@socketio.on('searcher_make_search')
def handle_searcher_make_search(data):
    """Searcher makes a search query"""
    app.logger.debug(f"\n========== searcher_make_search ==========")
    app.logger.debug(f"Request from: {request.sid}")
    app.logger.debug(f"Data received: {data}")

    try:
        # Note: frontend sends 'room_key'
        lobby_id = data.get('room_key', '').strip()
        search_query = data.get('query', '').strip()

        app.logger.debug(f"Lobby ID: {lobby_id}")
        app.logger.debug(f"Search query: {search_query}")

        if lobby_id not in lobbies:
            app.logger.debug(f"ERROR: Lobby not found")
            emit('error', {'message': 'Lobby not found'})
            return

        lobby = lobbies[lobby_id]

        # Get topic and forbidden words from server state instead of client
        round_state = lobby.get('roundState')
        if not round_state:
            app.logger.debug(f"ERROR: No active round found")
            emit('error', {'message': 'No active round found'})
            return

        secret_topic = round_state.get('topic')
        forbidden_words = round_state.get('forbiddenWords', [])

        app.logger.debug(f"Server-side Secret topic: {secret_topic}")
        app.logger.debug(f"Server-side Forbidden words: {forbidden_words}")

        if not search_query:
            app.logger.debug(f"ERROR: Empty search query")
            emit('error', {'message': 'Search query is required'})
            return

        # Validate query doesn't contain forbidden words
        validation_result = validate_query_logic(search_query, forbidden_words)
        app.logger.debug(f"Validation result: {validation_result}")

        if not validation_result['valid']:
            app.logger.debug(
                f"Query validation failed: {validation_result['violations']}")
            emit('search_result', {
                'query': search_query,
                'results': [],
                'valid': False,
                'violations': validation_result['violations'],
                'message': validation_result['message']
            })
            return

        # Perform search
        app.logger.debug(f"Performing Google search...")
        results = google_search(search_query, num_results=5)
        app.logger.debug(f"Google search returned: {len(results)} results")

        if not results:
            app.logger.debug(f"WARNING: No results from Google search")
            emit('search_result', {
                'query': search_query,
                'results': [],
                'count': 0,
                'valid': True,
                'query_index': 0,
                'message': 'Search completed but no results found'
            })
            return

        # Transform results to include redaction indicators
        results_with_indicators = []
        for result in results:
            results_with_indicators.append({
                'title': result.get('title', ''),
                'snippet': result.get('snippet', ''),
                'link': result.get('link', ''),
                'displayLink': result.get('displayLink', ''),
                # TODO: Implement redaction logic
                'redactedTerms': {'title': [], 'snippet': []}
            })

        app.logger.debug(
            f"Sending results with {len(results_with_indicators)} items")

        # Send results back to searcher
        emit('search_result', {
            'query': search_query,
            'results': results_with_indicators,
            'count': len(results),
            'valid': True,
            'query_index': 0,
            'message': f'Search completed: {len(results)} results'
        })

        app.logger.debug(f"Successfully emitted search_result")

    except Exception as e:
        app.logger.error(f"CRITICAL ERROR in handle_searcher_make_search: {e}")
        import traceback
        traceback.print_exc()
        try:
            emit('error', {'message': f'Search failed: {str(e)}'})
        except:
            app.logger.error(f"FAILED TO EMIT ERROR MESSAGE")

    app.logger.debug(f"========== searcher_make_search END ==========\n")


@socketio.on('searcher_select_query')
def handle_searcher_select_query(data):
    """Searcher selects which query result to send to guessers"""
    app.logger.debug(f"\n========== searcher_select_query ==========")
    app.logger.debug(f"Request from: {request.sid}")
    app.logger.debug(f"Data received: {data}")

    try:
        lobby_id = data.get('room_key', '').strip()
        query_index = data.get('query_index')

        app.logger.debug(f"Lobby ID: {lobby_id}")
        app.logger.debug(f"Query index: {query_index}")

        if lobby_id not in lobbies:
            app.logger.debug(f"ERROR: Lobby not found")
            emit('error', {'message': 'Lobby not found'})
            return

        lobby = lobbies[lobby_id]

        # Notify searcher that query was selected
        emit('query_selected', {
            'query_index': query_index,
            'message': 'Query selected and sent to guessers'
        })

        app.logger.debug(f"Notified searcher of selection")

        # TODO: Send redacted results to guessers
        # This would require storing search results in lobby state
        # and implementing redaction logic

    except Exception as e:
        app.logger.error(
            f"CRITICAL ERROR in handle_searcher_select_query: {e}")
        import traceback
        traceback.print_exc()
        try:
            emit('error', {'message': f'Failed to select query: {str(e)}'})
        except:
            app.logger.error(f"FAILED TO EMIT ERROR MESSAGE")

    app.logger.debug(f"========== searcher_select_query END ==========\n")


# ============ Lobby Endpoints ============


@app.route('/api/create-lobby', methods=['POST'])
def create_lobby():
    """
    Create a new lobby (private or public) - host will join separately
    Request: { "isPublic": bool }
    Response: { "lobbyId": str, "lobbyCode": str, "createdAt": str, "isPublic": bool }
    """
    data = request.json
    is_public = data.get('isPublic', True)

    lobby_id = str(uuid.uuid4())
    lobby_code = generate_lobby_code()
    while lobby_code in lobby_code_map:
        lobby_code = generate_lobby_code()

    lobby = {
        'lobbyId': lobby_id,
        'lobbyCode': lobby_code,
        'isPublic': is_public,
        'createdAt': datetime.now().isoformat(),
        'players': [],  # Empty initially - host will join via join-lobby
        'status': 'waiting',  # waiting, in_game, finished
        'gameConfig': None,
        'gameId': None,
        'roundState': None,  # Will be initialized when round starts
        'chatHistory': []    # Store chat messages
    }
    lobbies[lobby_id] = lobby
    lobby_code_map[lobby_code] = lobby_id

    return jsonify({
        'lobbyId': lobby_id,
        'lobbyCode': lobby_code,
        'createdAt': lobby['createdAt'],
        'isPublic': is_public
    }), 201


@app.route('/api/join-lobby/<lobby_code>', methods=['POST'])
def join_lobby(lobby_code):
    """
    Join a lobby via 6-char code - generates userId and playerName on backend
    Request: { "playerName": str (optional) }
    Response: { "lobbyId": str, "userId": str, "playerName": str, "players": [...], "message": str }
    """
    data = request.json or {}
    requested_player_name = data.get('playerName', '')

    lobby_id = lobby_code_map.get(lobby_code)
    if not lobby_id or lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]
    if lobby['status'] != 'waiting':
        return jsonify({'error': 'Game has already started'}), 400

    # Generate unique userId for this lobby
    user_id = generate_user_id(lobby_id)

    # Use requested player name or generated userId as default
    player_name = requested_player_name.strip() if requested_player_name else user_id

    # Add player to lobby - marked as not connected until they join via WebSocket
    lobby['players'].append({
        'playerId': user_id,
        'playerName': player_name,
        'role': None,
        'score': 0,
        'isConnected': False  # Will be set to True when they connect via WebSocket
    })

    app.logger.info(
        f"Player {player_name} ({user_id}) added to lobby {lobby_id}")

    # Broadcast updated lobby state to all connected clients
    emit_lobby_state(lobby_id)

    return jsonify({
        'lobbyId': lobby_id,
        'userId': user_id,
        'playerName': player_name,
        'players': lobby['players'],
        'message': f"{player_name} joined the lobby"
    }), 200


@app.route('/api/join-random-public-lobby', methods=['POST'])
def join_random_public_lobby():
    """
    Quick join a random public lobby - generates userId and playerName on backend
    Request: { "playerName": str (optional) }
    Response: { "lobbyId": str, "userId": str, "playerName": str, "players": [...], "lobbyCode": str }
    """
    data = request.json or {}
    requested_player_name = data.get('playerName', '')

    # Find available public lobbies with at least 1 player but not full
    available_lobbies = [
        (lobby_id, lobby) for lobby_id, lobby in lobbies.items()
        if lobby['isPublic'] and lobby['status'] == 'waiting' and len(lobby['players']) >= 1
    ]

    if not available_lobbies:
        # No available lobbies, create a new one
        lobby_result = create_lobby()
        lobby_data = lobby_result[0].get_json()
        lobby_code = lobby_data['lobbyCode']
        lobby_id = lobby_data['lobbyId']

        # Generate unique userId for this lobby
        user_id = generate_user_id(lobby_id)

        # Use requested player name or generated userId as default
        player_name = requested_player_name.strip() if requested_player_name else user_id

        # Add the first player (host) to the newly created lobby
        # Mark as isConnected: True since they are about to connect via WebSocket
        # This fixes the edge case where the host quick joins an empty lobby
        lobby = lobbies[lobby_id]
        lobby['players'].append({
            'playerId': user_id,
            'playerName': player_name,
            'role': None,
            'score': 0,
            'isConnected': True  # Host is immediately considered connected in quick join flow
        })

        app.logger.info(
            f"Player {player_name} ({user_id}) created and joined lobby {lobby_id} as host via quick join")

        return jsonify({
            'lobbyId': lobby_id,
            'lobbyCode': lobby_code,
            'userId': user_id,
            'playerName': player_name,
            'players': lobby['players'],
            'message': f"{player_name} joined the lobby"
        }), 200

    # Join the first available lobby
    lobby_id, lobby = available_lobbies[0]
    lobby_code = lobby['lobbyCode']

    # Generate unique userId for this lobby
    user_id = generate_user_id(lobby_id)

    # Use requested player name or generated userId as default
    player_name = requested_player_name.strip() if requested_player_name else user_id

    # Add player - marked as not connected until they join via WebSocket
    lobby['players'].append({
        'playerId': user_id,
        'playerName': player_name,
        'role': None,
        'score': 0,
        'isConnected': False  # Will be set to True when they connect via WebSocket
    })

    app.logger.info(
        f"Player {player_name} ({user_id}) added to lobby {lobby_id}")

    # Broadcast updated lobby state to all connected clients
    emit_lobby_state(lobby_id)

    return jsonify({
        'lobbyId': lobby_id,
        'lobbyCode': lobby_code,
        'userId': user_id,
        'playerName': player_name,
        'players': lobby['players'],
        'message': f"{player_name} joined the lobby"
    }), 200


# ============ Game Start Endpoints ============

@app.route('/api/start-game/<lobby_id>', methods=['POST'])
def start_game(lobby_id):
    """
    Start game and assign roles via WebSocket
    Request: {
        "difficulty": str (easy/medium/hard),
        "rounds": int,
        "timePerRound": int (seconds),
        "isRhythmEnabled": bool
    }
    Response: { "gameId": str, "message": str, "roles": {...} }
    """
    data = request.json

    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]

    if len(lobby['players']) < 2:
        return jsonify({'error': 'Need at least 2 players to start game'}), 400

    if lobby['status'] != 'waiting':
        return jsonify({'error': 'Game already started'}), 400

    # Validate game config
    game_config = {
        'difficulty': data.get('difficulty', 'medium'),
        'rounds': data.get('rounds', 3),
        'timePerRound': data.get('timePerRound', 60),
        'isRhythmEnabled': data.get('isRhythmEnabled', False)
    }

    # Assign roles randomly
    roles = ['searcher', 'guesser']
    random.shuffle(roles)

    for i, player in enumerate(lobby['players']):
        player['role'] = roles[i]

    # Update lobby status and config
    lobby['status'] = 'in_game'
    lobby['gameConfig'] = game_config
    game_id = str(uuid.uuid4())
    lobby['gameId'] = game_id

    # Emit game started event to all players in the lobby with their roles
    socketio.emit('game:started', {
        'gameId': game_id,
        'gameConfig': game_config,
        'players': lobby['players'],
        'message': 'Game has started'
    }, room=lobby_id)

    # Also emit individual role assignments to each player
    for player in lobby['players']:
        player_id = player['playerId']
        player_sid = user_socket_map.get(player_id)
        if player_sid:
            socketio.emit('game:role_assigned', {
                'role': player['role'],
                'gameConfig': game_config,
                'gameId': game_id
            }, room=player_sid)

    # Broadcast updated lobby state
    emit_lobby_state(lobby_id)

    return jsonify({
        'gameId': game_id,
        'lobbyId': lobby_id,
        'message': 'Game started',
        'gameConfig': game_config,
        'players': lobby['players']
    }), 200


@app.route('/api/lobby/<lobby_id>', methods=['GET'])
def get_lobby(lobby_id):
    """
    Get lobby details by ID
    Response: { "lobby": {...} }
    """
    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    return jsonify({'lobby': lobbies[lobby_id]}), 200


@app.route('/api/lobby-by-code/<lobby_code>', methods=['GET'])
def get_lobby_by_code(lobby_code):
    """
    Get lobby details by code
    Response: { "lobby": {...} }
    """
    lobby_id = lobby_code_map.get(lobby_code)
    if not lobby_id or lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    return jsonify({'lobby': lobbies[lobby_id]}), 200


# ============ Round Management Endpoints ============

@app.route('/api/round/select-topic', methods=['POST'])
def select_topic():
    """
    Searcher selects a topic and starts the round with automatic initial search
    Request: {
        "lobbyId": str,
        "userId": str,
        "topic": str,
        "forbiddenWords": [str],
        "roundNumber": int,
        "timeLimit": int (seconds)
    }
    Response: {
        "roundState": {...},
        "initialResults": [...] (for searcher),
        "redactedResults": [...] (for guessers)
    }
    """
    data = request.json
    lobby_id = data.get('lobbyId')
    user_id = data.get('userId')
    topic = data.get('topic')
    forbidden_words = data.get('forbiddenWords', [])
    round_number = data.get('roundNumber', 1)
    time_limit = data.get('timeLimit', 120)

    if not all([lobby_id, user_id, topic, forbidden_words]):
        return jsonify({'error': 'Missing required fields'}), 400

    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]

    # Verify user is the searcher
    searcher = None
    for player in lobby['players']:
        if player['playerId'] == user_id and player['role'] == 'searcher':
            searcher = player
            break

    if not searcher:
        return jsonify({'error': 'Only the searcher can select a topic'}), 403

    # Perform automatic initial search
    initial_query = topic  # Search for the topic itself
    initial_results = google_search(initial_query)

    # Redact results for guessers
    redacted_results = redact_with_gemini(
        initial_results, forbidden_words, initial_query, topic)

    # Reset player round status
    for p in lobby['players']:
        p['hasGuessedCorrectly'] = False
        p['guessCount'] = 0

    # Initialize round state
    current_time = time.time()
    lobby['roundState'] = {
        'roundNumber': round_number,
        'startTime': current_time,
        'endTime': current_time + time_limit,
        'timeLimit': time_limit,
        'topic': topic,
        'forbiddenWords': forbidden_words,
        'searcherReady': True,
        'lastResultSentAt': current_time,  # Initial result counts as first send
        'resultCooldown': 30,
        'initialResultSent': True,
        'isActive': True
    }

    # Start timer broadcast thread
    if lobby_id not in active_timer_threads:
        timer_thread = threading.Thread(
            target=timer_broadcast_thread, args=(lobby_id,), daemon=True)
        timer_thread.start()
        active_timer_threads[lobby_id] = timer_thread

    # Broadcast round started to all players
    socketio.emit('round:started', {
        'roundNumber': round_number,
        'topic': topic,
        'timeLimit': time_limit,
        'roundState': lobby['roundState']
    }, room=lobby_id)

    # Send initial results to searcher
    searcher_sid = user_socket_map.get(user_id)
    if searcher_sid:
        socketio.emit('round:initial_results', {
            'results': initial_results,
            'query': initial_query
        }, room=searcher_sid)

    # Send redacted results to guessers
    for player in lobby['players']:
        if player['role'] == 'guesser':
            guesser_sid = user_socket_map.get(player['playerId'])
            if guesser_sid:
                socketio.emit('round:redacted_results', {
                    'results': redacted_results
                }, room=guesser_sid)

    print(
        f"[Round] Started round {round_number} for lobby {lobby_id} with topic: {topic}")

    return jsonify({
        'roundState': lobby['roundState'],
        'initialResults': initial_results,
        'redactedResults': redacted_results,
        'message': 'Round started successfully'
    }), 200


@app.route('/api/round/send-result', methods=['POST'])
def send_result():
    """
    Searcher sends a search result to guessers (30-second cooldown enforced)
    Request: {
        "lobbyId": str,
        "userId": str,
        "query": str,
        "results": [...]
    }
    Response: { "success": bool, "cooldownRemaining": int }
    """
    data = request.json
    lobby_id = data.get('lobbyId')
    user_id = data.get('userId')
    query = data.get('query')
    results = data.get('results', [])

    if not all([lobby_id, user_id, query]):
        return jsonify({'error': 'Missing required fields'}), 400

    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]
    round_state = lobby.get('roundState')

    if not round_state or not round_state.get('isActive'):
        return jsonify({'error': 'No active round'}), 400

    # Verify user is the searcher
    is_searcher = False
    for player in lobby['players']:
        if player['playerId'] == user_id and player['role'] == 'searcher':
            is_searcher = True
            break

    if not is_searcher:
        return jsonify({'error': 'Only the searcher can send results'}), 403

    # Check cooldown
    cooldown_remaining = get_cooldown_remaining(round_state)
    if cooldown_remaining > 0:
        return jsonify({
            'error': f'Cooldown active. Wait {cooldown_remaining} seconds',
            'cooldownRemaining': cooldown_remaining
        }), 429

    # Redact results for guessers
    redacted_results = redact_with_gemini(
        results,
        round_state['forbiddenWords'],
        query,
        round_state['topic']
    )

    # Update cooldown timestamp
    round_state['lastResultSentAt'] = time.time()

    # Send redacted results to guessers
    for player in lobby['players']:
        if player['role'] == 'guesser':
            guesser_sid = user_socket_map.get(player['playerId'])
            if guesser_sid:
                socketio.emit('round:new_result', {
                    'results': redacted_results,
                    'timestamp': time.time()
                }, room=guesser_sid)

    # Notify searcher of successful send and start cooldown
    searcher_sid = user_socket_map.get(user_id)
    if searcher_sid:
        socketio.emit('round:result_sent_confirmation', {
            'cooldownDuration': round_state['resultCooldown']
        }, room=searcher_sid)

    print(
        f"[Round] Searcher sent result to guessers in lobby {lobby_id}, cooldown started")

    return jsonify({
        'success': True,
        'cooldownRemaining': round_state['resultCooldown'],
        'message': 'Result sent to guessers'
    }), 200


@app.route('/api/round/state/<lobby_id>', methods=['GET'])
def get_round_state(lobby_id):
    """
    Get current round state (for reconnections)
    Response: {
        "roundState": {...},
        "timeRemaining": int,
        "cooldownRemaining": int
    }
    """
    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]
    round_state = lobby.get('roundState')

    if not round_state:
        # Return success with null round state instead of error
        # This is normal when round hasn't started yet
        return jsonify({
            'roundState': None,
            'timeRemaining': 0,
            'cooldownRemaining': 0,
            'message': 'No active round yet'
        }), 200

    time_remaining = get_current_round_time_remaining(round_state)
    cooldown_remaining = get_cooldown_remaining(round_state)

    return jsonify({
        'roundState': round_state,
        'timeRemaining': time_remaining,
        'cooldownRemaining': cooldown_remaining
    }), 200


@app.route('/api/round/guess', methods=['POST'])
def make_guess():
    """
    Guesser makes a guess
    Request: { "lobbyId": str, "userId": str, "guess": str }
    Response: { "correct": bool, "score": int, "message": str }
    """
    data = request.json
    lobby_id = data.get('lobbyId')
    user_id = data.get('userId')
    guess = data.get('guess', '').strip()

    if not all([lobby_id, user_id, guess]):
        return jsonify({'error': 'Missing required fields'}), 400

    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]
    round_state = lobby.get('roundState')

    if not round_state or not round_state.get('isActive'):
        return jsonify({'error': 'No active round'}), 400

    # Find player
    player = next((p for p in lobby['players']
                  if p['playerId'] == user_id), None)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    if player['role'] != 'guesser':
        return jsonify({'error': 'Only guessers can guess'}), 403

    player['guessCount'] = player.get('guessCount', 0) + 1

    # Check guess (case-insensitive or semantic)
    topic = round_state['topic']

    verification = verify_guess_with_gemini(guess, topic)
    is_correct = verification['is_correct']
    similarity_score = verification.get('similarity_score', 0.0)

    if is_correct:
        player['hasGuessedCorrectly'] = True

        # Calculate score
        # Base: 100
        # Speed: +1 per second remaining
        # Efficiency: -10 per extra guess (max penalty 50)
        # First Try: +100

        time_remaining = get_current_round_time_remaining(round_state)
        guess_count = player['guessCount']

        base_score = 100
        speed_bonus = max(0, time_remaining)
        efficiency_penalty = min(50, (guess_count - 1) * 10)
        first_try_bonus = 100 if guess_count == 1 else 0
        # Up to 50 bonus points for semantic match
        similarity_bonus = int(similarity_score * 50)

        round_score = base_score + speed_bonus - \
            efficiency_penalty + first_try_bonus + similarity_bonus
        player['score'] += round_score

        # Award points to searcher for speed (collaboration bonus)
        searcher = next(
            (p for p in lobby['players'] if p['role'] == 'searcher'), None)
        if searcher:
            searcher_bonus = max(0, int(time_remaining / 2))
            searcher['score'] += searcher_bonus
            # Notify searcher? Maybe via general score update

        # Emit success event to this player
        player_sid = user_socket_map.get(user_id)
        if player_sid:
            socketio.emit('round:guess_result', {
                'correct': True,
                'score': round_score,
                'totalScore': player['score'],
                'breakdown': {
                    'base': base_score,
                    'speed': speed_bonus,
                    'efficiency': -efficiency_penalty,
                    'firstTry': first_try_bonus
                }
            }, room=player_sid)

        # Broadcast score update to everyone
        emit_lobby_state(lobby_id)

        # Check if all guessers are correct
        all_guessers = [p for p in lobby['players'] if p['role'] == 'guesser']
        all_correct = all(p.get('hasGuessedCorrectly', False)
                          for p in all_guessers)

        if all_correct:
            round_state['isActive'] = False
            socketio.emit('round:ended', {
                'reason': 'success',
                'roundNumber': round_state.get('roundNumber', 1),
                'message': 'All agents have identified the target!'
            }, room=lobby_id)
            print(f"[Round] Round ended (success) for lobby {lobby_id}")

    else:
        # Emit failure event
        player_sid = user_socket_map.get(user_id)
        if player_sid:
            socketio.emit('round:guess_result', {
                'correct': False,
                'message': 'Incorrect hypothesis'
            }, room=player_sid)

    return jsonify({
        'correct': is_correct,
        'attempts': player['guessCount']
    }), 200


# ...existing endpoints (search, validate-query, topics, health)...
@app.route('/api/search', methods=['POST'])
def search():
    """
    Endpoint for searcher to perform a search
    Returns original results for searcher to see
    """
    data = request.json
    search_query = data.get('query', '')

    if not search_query:
        return jsonify({'error': 'No search query provided'}), 400

    results = google_search(search_query)

    return jsonify({
        'query': search_query,
        'results': results,
        'count': len(results)
    })


@app.route('/api/search/redacted', methods=['POST'])
def search_redacted():
    """
    Endpoint that returns redacted results for the guesser
    """
    data = request.json
    search_query = data.get('query', '')
    forbidden_words = data.get('forbidden_words', [])
    secret_topic = data.get('secret_topic', '')

    if not all([search_query, forbidden_words, secret_topic]):
        return jsonify({'error': 'Missing required fields'}), 400

    # Perform search
    results = google_search(search_query)

    # Redact results using Gemini
    redacted_results = redact_with_gemini(
        results, forbidden_words, search_query, secret_topic)

    return jsonify({
        'query': '[REDACTED]',  # Hide the query from guesser
        'results': redacted_results,
        'count': len(redacted_results)
    })


@app.route('/api/validate-query', methods=['POST'])
def validate_query():
    """
    Check if search query contains forbidden words
    Returns validation result before search is performed
    """
    data = request.json
    query = data.get('query', '')
    forbidden_words = data.get('forbidden_words', [])

    validation_result = validate_query_logic(query, forbidden_words)
    return jsonify(validation_result)


@app.route('/api/topics/random', methods=['GET'])
def get_random_topic():
    """
    Generate a random topic with forbidden words
    """
    return jsonify(get_random_topic_data())


@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'google_search_available': GOOGLE_SEARCH_AVAILABLE and bool(GOOGLE_API_KEY),
        'gemini_available': GEMINI_AVAILABLE
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)
