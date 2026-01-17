from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import json
import random
import uuid
import string
from datetime import datetime
from flask_socketio import SocketIO, join_room, leave_room, emit
from typing import List

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# API Keys (add these to environment variables)
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# Try to import Google APIs (optional dependencies)
try:
    from googleapiclient.discovery import build
    GOOGLE_SEARCH_AVAILABLE = True
except ImportError:
    GOOGLE_SEARCH_AVAILABLE = False
    print("Warning: google-api-python-client not installed. Google Search will not work.")

try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
    GEMINI_AVAILABLE = GEMINI_API_KEY is not None
except ImportError:
    GEMINI_AVAILABLE = False
    model = None
    print("Warning: google-generativeai not installed. Gemini redaction will not work.")


def google_search(search_term, num_results=5):
    """
    Perform Google search using Custom Search API
    Returns list of results with title, snippet, link
    """
    if not GOOGLE_SEARCH_AVAILABLE:
        return []

    if not GOOGLE_API_KEY:
        print("Warning: GOOGLE_API_KEY not set")
        return []
    
    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        result = service.cse().list(
            q=search_term,
            cx=GOOGLE_API_KEY,
            num=num_results
        ).execute()

        search_results = []
        if 'items' in result:
            for item in result['items']:
                search_results.append({
                    'title': item.get('title', ''),
                    'snippet': item.get('snippet', ''),
                    'link': item.get('link', ''),
                    'displayLink': item.get('displayLink', '')
                })

        return search_results
    except Exception as e:
        print(f"Search error: {e}")
        return []


def redact_with_gemini(search_results, forbidden_words, search_query, secret_topic):
    """
    Use Gemini to intelligently redact search results
    Returns redacted results with redaction blocks
    """
    if not GEMINI_AVAILABLE or not model:
        return simple_redaction(search_results, forbidden_words, search_query)

    # Prepare the prompt for Gemini
    prompt = f"""
You are a redaction AI for a guessing game. Your job is to redact search results strategically.

SECRET TOPIC: {secret_topic}
FORBIDDEN WORDS: {', '.join(forbidden_words)}
SEARCH QUERY USED: {search_query}

REDACTION RULES:
1. Replace the secret topic name with [REDACTED]
2. Replace all forbidden words with [REDACTED]
3. Replace all words from the search query with [REDACTED]
4. Replace obvious synonyms and variations of forbidden words with [REDACTED]
5. Keep enough context clues (dates, locations, related names, descriptions) for a smart person to guess
6. Make sure to preserve sentence structure (keep articles, prepositions, conjunctions)

SEARCH RESULTS TO REDACT:
{json.dumps(search_results, indent=2)}

Return ONLY the redacted results in JSON format:
[
  {{
    "title": "redacted title",
    "snippet": "redacted snippet with [REDACTED] blocks",
    "link": "original link",
    "displayLink": "domain"
  }}
]

Important: Use exactly [REDACTED] for each redaction. Be strategic - leave enough clues but hide the obvious answer.
"""

    try:
        response = model.generate_content(prompt)
        redacted_text = response.text

        # Extract JSON from response (handle markdown code blocks)
        if '```json' in redacted_text:
            redacted_text = redacted_text.split('```json')[1].split('```')[0].strip()
        elif '```' in redacted_text:
            redacted_text = redacted_text.split('```')[1].split('```')[0].strip()

        redacted_results = json.loads(redacted_text)
        return redacted_results
    except Exception as e:
        print(f"Gemini redaction error: {e}")
        # Fallback: Simple regex-based redaction
        return simple_redaction(search_results, forbidden_words, search_query)


def simple_redaction(search_results, forbidden_words, search_query):
    """
    Fallback simple redaction if Gemini fails
    """
    redacted_results = []

    # Combine all words to redact
    words_to_redact = list(forbidden_words) + search_query.lower().split()

    for result in search_results:
        redacted_result = result.copy()

        # Redact title and snippet
        for field in ['title', 'snippet']:
            if field in result:
                text = result[field]
                for word in words_to_redact:
                    if len(word) > 2:  # Only redact words longer than 2 chars
                        # Case-insensitive replacement
                        pattern = re.compile(re.escape(word), re.IGNORECASE)
                        text = pattern.sub('[REDACTED]', text)
                redacted_result[field] = text

        redacted_results.append(redacted_result)

    return redacted_results
# ============ In-Memory Storage (replace with database later) ============
lobbies = {}  # Store active lobbies
players = {}  # Store player sessions
user_socket_map = {}     # userId -> sid
socket_user_map = {}     # sid -> userId

# Map lobbyCode to lobbyId for quick lookup
lobby_code_map = {}

# Helper to generate a 4-char alphanumeric code (upper/lowercase + numbers)
def generate_lobby_code(length=4):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

# Helper for socket connections
def emit_lobby_state(lobby_id):
    lobby = lobbies.get(lobby_id)
    if not lobby:
        return
    # Broadcast to everyone in the lobby room
    socketio.emit("lobby:state", {"lobby": lobby}, room=lobby_id)
# socket event handlers
@socketio.on("connect")
def on_connect():
    print("Socket connected:", request.sid)

@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    user_id = socket_user_map.get(sid)
    if user_id:
        user_socket_map.pop(user_id, None)
        socket_user_map.pop(sid, None)
    print("Socket disconnected:", sid)

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

    # Send current state to just this socket
    emit("lobby:state", {"lobby": lobbies[lobby_id]})

    # Also broadcast updated state to everyone (optional)
    emit_lobby_state(lobby_id)

@socketio.on("lobby:leave")
def on_lobby_leave(data):
    lobby_id = data.get("lobbyId")
    if lobby_id:
        leave_room(lobby_id)
        emit_lobby_state(lobby_id)


# ============ Lobby Endpoints ============

@app.route('/api/create-lobby', methods=['POST'])
def create_lobby():
    """
    Create a new lobby (private or public)
    Request: { "isPublic": bool, "playerName": str, "userId": str }
    Response: { "lobbyId": str, "lobbyCode": str, "createdAt": str, "isPublic": bool }
    """
    data = request.json
    is_public = data.get('isPublic', True)
    player_name = data.get('playerName', 'Player')
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    lobby_id = str(uuid.uuid4())
    lobby_code = generate_lobby_code()
    while lobby_code in lobby_code_map:
        lobby_code = generate_lobby_code()


    lobby = {
        'lobbyId': lobby_id,
        'lobbyCode': lobby_code,
        'isPublic': is_public,
        'createdAt': datetime.now().isoformat(),
        'players': [{'playerId': user_id, 'playerName': player_name, 'role': None}],
        'status': 'waiting',  # waiting, in_game, finished
        'gameConfig': None,
        'gameId': None
    }
    lobbies[lobby_id] = lobby
    lobby_code_map[lobby_code] = lobby_id

    # Broadcast state in case host already connected & joined room
    emit_lobby_state(lobby_id)

    return jsonify({
        'lobbyId': lobby_id,
        'lobbyCode': lobby_code,
        'createdAt': lobby['createdAt'],
        'isPublic': is_public
    }), 201
@app.route('/api/join-lobby/<lobby_code>', methods=['POST'])
def join_lobby(lobby_code):
    """
    Join a lobby via 4-char code
    Request: { "playerName": str, "userId": str }
    Response: { "lobbyId": str, "players": [...], "message": str }
    """
    data = request.json
    player_name = data.get('playerName', 'Player')
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    lobby_id = lobby_code_map.get(lobby_code)
    if not lobby_id or lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    lobby = lobbies[lobby_id]
    if lobby['status'] != 'waiting':
        return jsonify({'error': 'Game has already started'}), 400

    # Idempotent join: if already in lobby, just return lobby info
    if any(p['playerId'] == user_id for p in lobby['players']):
        return jsonify({
            'lobbyId': lobby_id,
            'players': lobby['players'],
            'message': "User already in lobby"
        }), 200

    # Check if lobby is full (max 2 players for this game) config
    # if len(lobby['players']) >= 2:
    #     return jsonify({'error': 'Lobby is full'}), 400
    # Check if game already started


    lobby['players'].append({
        'playerId': user_id,
        'playerName': player_name,
        'role': None
    })
    emit_lobby_state(lobby_id)

    return jsonify({
        'lobbyId': lobby_id,
        'players': lobby['players'],
        'message': f"{player_name} joined the lobby"
    }), 200


@app.route('/api/join-random-public-lobby', methods=['POST'])
def join_random_public_lobby():
    """
    Quick join a random public lobby
    Request: { "playerName": str, "userId": str }
    Response: { "lobbyId": str, "players": [...], "lobbyCode": str }
    """
    data = request.json
    player_name = data.get('playerName', 'Player')
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    # Find available public lobbies with only 1 player
    available_lobbies = [
        (lobby_id, lobby) for lobby_id, lobby in lobbies.items()
        if lobby['isPublic'] and lobby['status'] == 'waiting' and len(lobby['players']) == 1
    ]

    if not available_lobbies:
        # No available lobbies, create a new one
        return create_lobby()

    # Join the first available lobby
    lobby_id, lobby = available_lobbies[0]
    if any(p['playerId'] == user_id for p in lobby['players']):
        return jsonify({'error': 'User already in lobby'}), 400
    lobby['players'].append({
        'playerId': user_id,
        'playerName': player_name,
        'role': None
    })

    return jsonify({
        'lobbyId': lobby_id,
        'lobbyCode': lobby['lobbyCode'],
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

    # TODO: Send WebSocket message to both players with their assigned roles
    # socket.emit('role_assigned', {'role': role, 'gameConfig': game_config})

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
    Get lobby details
    Response: { "lobby": {...} }
    """
    if lobby_id not in lobbies:
        return jsonify({'error': 'Lobby not found'}), 404

    return jsonify({'lobby': lobbies[lobby_id]}), 200


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
    redacted_results = redact_with_gemini(results, forbidden_words, search_query, secret_topic)

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
    app.run(debug=True, port=5000)
