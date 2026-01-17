"""
Test cases for app.py
Tests Flask API endpoints for lobby management and game functionality
"""
import pytest
import json
from unittest.mock import patch, Mock
from app import app, socketio, lobbies, lobby_code_map


@pytest.fixture
def client():
    """Flask test client fixture"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def clean_lobbies():
    """Clean up lobbies before and after each test"""
    lobbies.clear()
    lobby_code_map.clear()
    yield
    lobbies.clear()
    lobby_code_map.clear()


class TestHealthEndpoint:
    """Test cases for health check endpoint"""

    def test_health_check(self, client):
        """Test health check endpoint returns 200"""
        response = client.get('/api/health')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert 'status' in data
        assert data['status'] == 'healthy'
        assert 'google_search_available' in data
        assert 'gemini_available' in data


class TestCreateLobby:
    """Test cases for lobby creation"""

    def test_create_public_lobby_success(self, client, clean_lobbies):
        """Test creating a public lobby"""
        response = client.post('/api/create-lobby', json={
            'isPublic': True
        })

        assert response.status_code == 201
        data = json.loads(response.data)

        assert 'lobbyId' in data
        assert 'lobbyCode' in data
        assert 'createdAt' in data
        assert data['isPublic'] is True
        assert len(data['lobbyCode']) == 6

    def test_create_private_lobby_success(self, client, clean_lobbies):
        """Test creating a private lobby"""
        response = client.post('/api/create-lobby', json={
            'isPublic': False
        })

        assert response.status_code == 201
        data = json.loads(response.data)

        assert data['isPublic'] is False

    def test_create_lobby_default_values(self, client, clean_lobbies):
        """Test creating lobby with minimal data"""
        response = client.post('/api/create-lobby', json={})

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'lobbyId' in data
        assert 'lobbyCode' in data
        # Lobby should be public by default
        assert data['isPublic'] is True


class TestJoinLobby:
    """Test cases for joining lobbies"""

    def test_join_lobby_success(self, client, clean_lobbies):
        """Test successfully joining a lobby"""
        # First create a lobby
        create_response = client.post('/api/create-lobby', json={
            'isPublic': True
        })
        lobby_code = json.loads(create_response.data)['lobbyCode']

        # Join the lobby with first player
        response = client.post(f'/api/join-lobby/{lobby_code}', json={
            'playerName': 'Joiner'
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'lobbyId' in data
        assert 'userId' in data
        assert 'playerName' in data
        assert 'players' in data
        assert len(data['players']) == 1

    def test_join_lobby_nonexistent(self, client, clean_lobbies):
        """Test joining a non-existent lobby"""
        response = client.post('/api/join-lobby/ABCDEF', json={
            'playerName': 'Player'
        })

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_join_lobby_multiple_players(self, client, clean_lobbies):
        """Test multiple players joining same lobby"""
        # Create lobby
        create_response = client.post('/api/create-lobby', json={
            'isPublic': True
        })
        lobby_code = json.loads(create_response.data)['lobbyCode']

        # Join with first player
        response1 = client.post(f'/api/join-lobby/{lobby_code}', json={
            'playerName': 'Player1'
        })
        # Join with second player
        response2 = client.post(f'/api/join-lobby/{lobby_code}', json={
            'playerName': 'Player2'
        })

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Should have 2 players
        data = json.loads(response2.data)
        assert len(data['players']) == 2
        assert data['players'][0]['playerName'] == 'Player1'
        assert data['players'][1]['playerName'] == 'Player2'


class TestJoinRandomPublicLobby:
    """Test cases for joining random public lobbies"""

    def test_join_random_creates_new_lobby(self, client, clean_lobbies):
        """Test joining random lobby when none available creates new one"""
        response = client.post('/api/join-random-public-lobby', json={})

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'lobbyId' in data
        assert 'lobbyCode' in data
        assert 'userId' in data
        assert 'playerName' in data
        assert 'players' in data
        assert len(data['players']) == 1

    def test_join_random_first_user_is_connected(self, client, clean_lobbies):
        """Test edge case: first user quick joining empty lobby is marked as connected"""
        response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'FirstPlayer'
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        # Verify the player was added
        assert len(data['players']) == 1
        player = data['players'][0]

        # This is the fix: first user (host) should be marked as connected
        # so they can receive websocket updates immediately
        assert player['isConnected'] is True
        assert player['playerName'] == 'FirstPlayer'

        # Verify they are the host (first player)
        assert data['players'][0]['playerId'] == data['userId']

    def test_join_random_joins_existing_lobby(self, client, clean_lobbies):
        """Test joining random lobby joins existing available lobby"""
        # First user creates a lobby via quick join
        first_response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Host'
        })
        first_lobby_id = json.loads(first_response.data)['lobbyId']

        # Second user joins via quick join
        response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Joiner'
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        # Should join the existing lobby
        assert data['lobbyId'] == first_lobby_id
        assert len(data['players']) == 2

        # First player should still be connected
        assert data['players'][0]['isConnected'] is True
        # Second player should be marked as not connected until websocket join
        assert data['players'][1]['isConnected'] is False


class TestGetLobby:
    """Test cases for getting lobby information"""

    def test_get_lobby_success(self, client, clean_lobbies):
        """Test getting lobby details"""
        # Create a lobby
        create_response = client.post('/api/create-lobby', json={
            'isPublic': True
        })
        lobby_id = json.loads(create_response.data)['lobbyId']

        # Get lobby details
        response = client.get(f'/api/lobby/{lobby_id}')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'lobby' in data
        assert data['lobby']['lobbyId'] == lobby_id

    def test_get_lobby_nonexistent(self, client, clean_lobbies):
        """Test getting non-existent lobby"""
        response = client.get('/api/lobby/nonexistent-id')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data


class TestStartGame:
    """Test cases for starting games"""

    def test_start_game_success(self, client, clean_lobbies):
        """Test successfully starting a game"""
        # Create lobby with 2 players via quick join
        first_response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Host'
        })
        lobby_id = json.loads(first_response.data)['lobbyId']

        # Second player joins
        second_response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Joiner'
        })

        # Start the game
        response = client.post(f'/api/start-game/{lobby_id}', json={
            'difficulty': 'medium',
            'rounds': 3,
            'timePerRound': 60,
            'isRhythmEnabled': False
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'gameId' in data
        assert 'gameConfig' in data
        assert 'players' in data
        assert data['gameConfig']['difficulty'] == 'medium'
        assert data['gameConfig']['rounds'] == 3

    def test_start_game_not_enough_players(self, client, clean_lobbies):
        """Test starting game with only 1 player"""
        # Create lobby with only 1 player
        response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Host'
        })
        lobby_id = json.loads(response.data)['lobbyId']

        # Try to start game
        response = client.post(f'/api/start-game/{lobby_id}', json={
            'difficulty': 'medium',
            'rounds': 3,
            'timePerRound': 60
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_start_game_nonexistent_lobby(self, client, clean_lobbies):
        """Test starting game in non-existent lobby"""
        response = client.post('/api/start-game/nonexistent-id', json={
            'difficulty': 'medium',
            'rounds': 3
        })

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data

    def test_start_game_assigns_roles(self, client, clean_lobbies):
        """Test that starting game assigns roles to players"""
        # Create lobby with 2 players
        first_response = client.post('/api/join-random-public-lobby', json={
            'playerName': 'Host'
        })
        lobby_id = json.loads(first_response.data)['lobbyId']

        client.post('/api/join-random-public-lobby', json={
            'playerName': 'Joiner'
        })

        # Start game
        response = client.post(f'/api/start-game/{lobby_id}', json={
            'difficulty': 'medium',
            'rounds': 3
        })

        data = json.loads(response.data)
        players = data['players']

        # Check roles are assigned
        roles = [p['role'] for p in players]
        assert 'searcher' in roles
        assert 'guesser' in roles


class TestSearchEndpoints:
    """Test cases for search endpoints"""

    @patch('app.google_search')
    def test_search_endpoint(self, mock_search, client):
        """Test search endpoint"""
        mock_search.return_value = [
            {
                'title': 'Test Result',
                'snippet': 'Test snippet',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        response = client.post('/api/search', json={
            'query': 'test query'
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'query' in data
        assert 'results' in data
        assert 'count' in data
        assert data['query'] == 'test query'
        assert len(data['results']) == 1

    def test_search_endpoint_empty_query(self, client):
        """Test search with empty query"""
        response = client.post('/api/search', json={
            'query': ''
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    @patch('app.google_search')
    @patch('app.redact_with_gemini')
    def test_search_redacted_endpoint(self, mock_redact, mock_search, client):
        """Test redacted search endpoint"""
        mock_search.return_value = [
            {
                'title': 'Bitcoin guide',
                'snippet': 'Learn about bitcoin',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        mock_redact.return_value = [
            {
                'title': '[REDACTED] guide',
                'snippet': 'Learn about [REDACTED]',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        response = client.post('/api/search/redacted', json={
            'query': 'cryptocurrency',
            'forbidden_words': ['bitcoin'],
            'secret_topic': 'Bitcoin'
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['query'] == '[REDACTED]'
        assert '[REDACTED]' in data['results'][0]['title']

    def test_search_redacted_missing_fields(self, client):
        """Test redacted search with missing required fields"""
        response = client.post('/api/search/redacted', json={
            'query': 'test'
        })

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data


class TestValidateQuery:
    """Test cases for query validation endpoint"""

    def test_validate_query_valid(self, client):
        """Test validating a valid query"""
        response = client.post('/api/validate-query', json={
            'query': 'digital currency',
            'forbidden_words': ['bitcoin']
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['valid'] is True
        assert data['violations'] == []

    def test_validate_query_invalid(self, client):
        """Test validating a query with forbidden words"""
        response = client.post('/api/validate-query', json={
            'query': 'what is bitcoin',
            'forbidden_words': ['bitcoin']
        })

        assert response.status_code == 200
        data = json.loads(response.data)

        assert data['valid'] is False
        assert 'bitcoin' in data['violations']


class TestRandomTopic:
    """Test cases for random topic generation"""

    def test_get_random_topic(self, client):
        """Test getting a random topic"""
        response = client.get('/api/topics/random')

        assert response.status_code == 200
        data = json.loads(response.data)

        assert 'topic' in data
        assert 'forbidden_words' in data
        assert isinstance(data['topic'], str)
        assert isinstance(data['forbidden_words'], list)
        assert len(data['forbidden_words']) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
