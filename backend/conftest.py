"""
Pytest configuration and shared fixtures for backend tests.
This file is automatically discovered by pytest.
"""
import pytest
import sys
import os

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables for each test"""
    # Store original env vars
    original_env = os.environ.copy()

    yield

    # Restore original env vars
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_api_keys(monkeypatch):
    """Set mock API keys for testing"""
    monkeypatch.setenv('GOOGLE_API_KEY', 'test_google_key')
    monkeypatch.setenv('GEMINI_API_KEY', 'test_gemini_key')


@pytest.fixture
def sample_search_results():
    """Sample search results for testing"""
    return [
        {
            'title': 'Sample Result 1',
            'snippet': 'This is a sample snippet for testing',
            'link': 'https://example.com/1',
            'displayLink': 'example.com'
        },
        {
            'title': 'Sample Result 2',
            'snippet': 'Another sample snippet for testing',
            'link': 'https://example.com/2',
            'displayLink': 'example.com'
        }
    ]


@pytest.fixture
def sample_topic_data():
    """Sample topic data for testing"""
    return {
        'topic': 'Bitcoin',
        'forbidden_words': ['bitcoin', 'crypto', 'cryptocurrency', 'blockchain']
    }
