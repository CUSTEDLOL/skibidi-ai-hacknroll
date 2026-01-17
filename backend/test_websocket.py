"""
Test cases for websocket_server.py
Tests WebSocket events and room management functionality
"""
import pytest
from unittest.mock import patch, Mock
from websocket_server import app, socketio, rooms, Role, GameState, Player


@pytest.fixture
def client():
    """Flask-SocketIO test client fixture"""
    app.config['TESTING'] = True
    return socketio.test_client(app)


@pytest.fixture
def clean_rooms():
    """Clean up rooms before and after each test"""
    rooms.clear()
    yield
    rooms.clear()


class TestSocketConnection:
    """Test cases for socket connection/disconnection"""

    def test_client_connects(self, client, clean_rooms):
        """Test client can connect to socket"""
        assert client.is_connected()

    def test_client_receives_connected_event(self, client, clean_rooms):
        """Test client receives connected event"""
        received = client.get_received()
        # Find the 'connected' event
        connected_events = [r for r in received if r['name'] == 'connected']
        assert len(connected_events) > 0
        assert 'sid' in connected_events[0]['args'][0]


class TestJoinRoom:
    """Test cases for joining rooms"""

    def test_join_room_creates_new_room(self, client, clean_rooms):
        """Test joining a new room creates it"""
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })

        received = client.get_received()

        # Check for joined_room event
        joined_events = [r for r in received if r['name'] == 'joined_room']
        assert len(joined_events) > 0
        assert joined_events[0]['args'][0]['room_key'] == 'TESTROOM'

        # Verify room was created
        assert 'TESTROOM' in rooms
        assert len(rooms['TESTROOM'].players) == 1

    def test_join_room_without_room_key(self, client, clean_rooms):
        """Test joining without room key returns error"""
        client.emit('join_room', {
            'name': 'Player1'
        })

        received = client.get_received()
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0

    def test_join_room_normalizes_room_key(self, client, clean_rooms):
        """Test room key is normalized to uppercase"""
        client.emit('join_room', {
            'room_key': 'testroom',
            'name': 'Player1'
        })

        received = client.get_received()
        joined_events = [r for r in received if r['name'] == 'joined_room']
        assert joined_events[0]['args'][0]['room_key'] == 'TESTROOM'


class TestPickRole:
    """Test cases for role selection"""

    def test_pick_searcher_role(self, client, clean_rooms):
        """Test picking searcher role"""
        # Join room first
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()  # Clear received events

        # Pick searcher role
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })

        received = client.get_received()
        role_events = [r for r in received if r['name'] == 'role_assigned']
        assert len(role_events) > 0
        assert role_events[0]['args'][0]['role'] == 'searcher'

    def test_pick_guesser_role(self, client, clean_rooms):
        """Test picking guesser role"""
        # Join room first
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()

        # Pick guesser role
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'guesser'
        })

        received = client.get_received()
        role_events = [r for r in received if r['name'] == 'role_assigned']
        assert len(role_events) > 0
        assert role_events[0]['args'][0]['role'] == 'guesser'

    def test_pick_random_role(self, client, clean_rooms):
        """Test picking random role"""
        # Join room first
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()

        # Pick random role
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'random'
        })

        received = client.get_received()
        role_events = [r for r in received if r['name'] == 'role_assigned']
        assert len(role_events) > 0
        # Should be either searcher or guesser
        assert role_events[0]['args'][0]['role'] in ['searcher', 'guesser']

    def test_searcher_role_already_taken(self, client, clean_rooms):
        """Test that only one player can be searcher"""
        # Create room with a searcher
        room = GameState(room_key='TESTROOM')
        player1_sid = 'sid1'
        player1 = Player(sid=player1_sid, role=Role.SEARCHER)
        room.players[player1_sid] = player1
        room.searcher_sid = player1_sid
        rooms['TESTROOM'] = room

        # Join as second player
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player2'
        })
        client.get_received()

        # Try to pick searcher role
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })

        received = client.get_received()
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0


class TestSecretWordSelection:
    """Test cases for secret word generation and selection"""

    @patch('websocket_server.get_random_topic_data')
    def test_get_secret_word_options(self, mock_topic, client, clean_rooms):
        """Test getting secret word options as searcher"""
        mock_topic.return_value = {
            'topic': 'Bitcoin',
            'forbidden_words': ['bitcoin', 'crypto']
        }

        # Join and become searcher
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Searcher'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })
        client.get_received()

        # Get secret word options
        client.emit('searcher_get_secret_word_options', {
            'room_key': 'TESTROOM'
        })

        received = client.get_received()
        options_events = [r for r in received if r['name']
                          == 'secret_word_options']
        assert len(options_events) > 0
        assert 'options' in options_events[0]['args'][0]

    def test_select_secret_word_as_searcher(self, client, clean_rooms):
        """Test selecting secret word as searcher"""
        # Setup: join and become searcher with secret word options
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Searcher'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })

        # Manually set up secret word options in room
        room = rooms['TESTROOM']
        room.secret_word_options = ['Bitcoin', 'Bitcoin (variant 1)']
        room.forbidden_words = ['bitcoin']

        client.get_received()

        # Select secret word
        client.emit('searcher_select_secret_word', {
            'room_key': 'TESTROOM',
            'selected_word': 'Bitcoin'
        })

        received = client.get_received()
        selected_events = [r for r in received if r['name']
                           == 'secret_word_selected']
        assert len(selected_events) > 0
        assert selected_events[0]['args'][0]['selected_word'] == 'Bitcoin'

        # Verify game is active
        assert rooms['TESTROOM'].game_active is True

    def test_non_searcher_cannot_get_secret_words(self, client, clean_rooms):
        """Test that non-searcher cannot get secret word options"""
        # Join as guesser
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Guesser'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'guesser'
        })
        client.get_received()

        # Try to get secret word options
        client.emit('searcher_get_secret_word_options', {
            'room_key': 'TESTROOM'
        })

        received = client.get_received()
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0


class TestSearcherMakeSearch:
    """Test cases for searcher making searches"""

    @patch('websocket_server.google_search')
    @patch('websocket_server.validate_query_logic')
    def test_searcher_make_valid_search(self, mock_validate, mock_search, client, clean_rooms):
        """Test searcher making a valid search"""
        mock_validate.return_value = {
            'valid': True,
            'violations': []
        }
        mock_search.return_value = [
            {
                'title': 'Result 1',
                'snippet': 'Snippet 1',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        # Setup: create room with active game
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.forbidden_words = ['bitcoin']
        room.secret_topic = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join as searcher
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Searcher'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })
        client.get_received()

        # Make search
        client.emit('searcher_make_search', {
            'room_key': 'TESTROOM',
            'query': 'digital currency'
        })

        received = client.get_received()
        search_events = [r for r in received if r['name'] == 'search_result']
        assert len(search_events) > 0
        assert search_events[0]['args'][0]['valid'] is True
        assert len(search_events[0]['args'][0]['results']) == 1

    @patch('websocket_server.validate_query_logic')
    def test_searcher_search_with_forbidden_words(self, mock_validate, client, clean_rooms):
        """Test search with forbidden words is rejected"""
        mock_validate.return_value = {
            'valid': False,
            'violations': ['bitcoin'],
            'message': 'Query contains forbidden words: bitcoin'
        }

        # Setup room
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.forbidden_words = ['bitcoin']
        rooms['TESTROOM'] = room

        # Join as searcher
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Searcher'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })
        client.get_received()

        # Try to search with forbidden word
        client.emit('searcher_make_search', {
            'room_key': 'TESTROOM',
            'query': 'what is bitcoin'
        })

        received = client.get_received()
        search_events = [r for r in received if r['name'] == 'search_result']
        assert len(search_events) > 0
        assert search_events[0]['args'][0]['valid'] is False

    def test_non_searcher_cannot_search(self, client, clean_rooms):
        """Test that non-searcher cannot make searches"""
        # Setup room
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        rooms['TESTROOM'] = room

        # Join as guesser
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Guesser'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'guesser'
        })
        client.get_received()

        # Try to search
        client.emit('searcher_make_search', {
            'room_key': 'TESTROOM',
            'query': 'test query'
        })

        received = client.get_received()
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0


class TestGuesserMakeGuess:
    """Test cases for guesser making guesses"""

    def test_guesser_correct_guess(self, client, clean_rooms):
        """Test guesser making correct guess"""
        # Setup room with secret word
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.selected_secret_word = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join as guesser
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Guesser'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'guesser'
        })
        client.get_received()

        # Make correct guess
        client.emit('guesser_make_guess', {
            'room_key': 'TESTROOM',
            'guess': 'Bitcoin'
        })

        received = client.get_received()
        guess_events = [r for r in received if r['name'] == 'guess_result']
        assert len(guess_events) > 0
        assert guess_events[0]['args'][0]['accepted'] is True

    def test_guesser_incorrect_guess(self, client, clean_rooms):
        """Test guesser making incorrect guess"""
        # Setup room
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.selected_secret_word = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join as guesser
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Guesser'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'guesser'
        })
        client.get_received()

        # Make wrong guess
        client.emit('guesser_make_guess', {
            'room_key': 'TESTROOM',
            'guess': 'Ethereum'
        })

        received = client.get_received()
        guess_events = [r for r in received if r['name'] == 'guess_result']
        assert len(guess_events) > 0
        assert guess_events[0]['args'][0]['accepted'] is False

    def test_non_guesser_cannot_guess(self, client, clean_rooms):
        """Test that non-guesser cannot make guesses"""
        # Setup room
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.selected_secret_word = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join as searcher
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Searcher'
        })
        client.emit('pick_role', {
            'room_key': 'TESTROOM',
            'role': 'searcher'
        })
        client.get_received()

        # Try to guess
        client.emit('guesser_make_guess', {
            'room_key': 'TESTROOM',
            'guess': 'Bitcoin'
        })

        received = client.get_received()
        error_events = [r for r in received if r['name'] == 'error']
        assert len(error_events) > 0


class TestEndGame:
    """Test cases for ending/continuing games"""

    def test_end_game(self, client, clean_rooms):
        """Test ending the game"""
        # Setup active game
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.current_round = 2
        room.selected_secret_word = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join room
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()

        # End game
        client.emit('end_game', {
            'room_key': 'TESTROOM',
            'action': 'end'
        })

        received = client.get_received()
        end_events = [r for r in received if r['name'] == 'game_ended']
        assert len(end_events) > 0

        # Verify game state is reset
        assert rooms['TESTROOM'].game_active is False
        assert rooms['TESTROOM'].current_round == 1

    def test_continue_to_next_round(self, client, clean_rooms):
        """Test continuing to next round"""
        # Setup active game
        room = GameState(room_key='TESTROOM')
        room.game_active = True
        room.current_round = 1
        room.selected_secret_word = 'Bitcoin'
        rooms['TESTROOM'] = room

        # Join room
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()

        # Continue game
        client.emit('end_game', {
            'room_key': 'TESTROOM',
            'action': 'continue'
        })

        received = client.get_received()
        continue_events = [
            r for r in received if r['name'] == 'round_continued']
        assert len(continue_events) > 0

        # Verify round incremented
        assert rooms['TESTROOM'].current_round == 2


class TestGetRoomState:
    """Test cases for getting room state"""

    def test_get_room_state(self, client, clean_rooms):
        """Test getting current room state"""
        # Join room
        client.emit('join_room', {
            'room_key': 'TESTROOM',
            'name': 'Player1'
        })
        client.get_received()

        # Get room state
        client.emit('get_room_state', {
            'room_key': 'TESTROOM'
        })

        received = client.get_received()
        state_events = [r for r in received if r['name'] == 'room_state']
        assert len(state_events) > 0
        assert 'room_key' in state_events[0]['args'][0]
        assert state_events[0]['args'][0]['room_key'] == 'TESTROOM'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
