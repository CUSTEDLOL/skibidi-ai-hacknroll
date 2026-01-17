"""
Test cases for search_utils.py
Tests search, redaction, validation, and topic generation functions
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from search_utils import (
    google_search,
    redact_with_gemini,
    simple_redaction,
    validate_query_logic,
    get_random_topic_data
)


class TestGoogleSearch:
    """Test cases for Google Search functionality"""

    @patch('search_utils.GOOGLE_SEARCH_AVAILABLE', True)
    @patch('search_utils.GOOGLE_API_KEY', 'test_api_key')
    @patch('search_utils.build')
    def test_google_search_success(self, mock_build):
        """Test successful Google search"""
        # Mock the API response
        mock_service = Mock()
        mock_cse = Mock()
        mock_list = Mock()

        mock_list.execute.return_value = {
            'items': [
                {
                    'title': 'Test Title 1',
                    'snippet': 'Test snippet 1',
                    'link': 'https://example.com/1',
                    'displayLink': 'example.com'
                },
                {
                    'title': 'Test Title 2',
                    'snippet': 'Test snippet 2',
                    'link': 'https://example.com/2',
                    'displayLink': 'example.com'
                }
            ]
        }

        mock_cse.list.return_value = mock_list
        mock_service.cse.return_value = mock_cse
        mock_build.return_value = mock_service

        results = google_search('test query', num_results=2)

        assert len(results) == 2
        assert results[0]['title'] == 'Test Title 1'
        assert results[0]['snippet'] == 'Test snippet 1'
        assert results[0]['link'] == 'https://example.com/1'
        assert results[1]['title'] == 'Test Title 2'

    @patch('search_utils.GOOGLE_SEARCH_AVAILABLE', False)
    def test_google_search_unavailable(self):
        """Test Google search when service is unavailable"""
        results = google_search('test query')
        assert results == []

    @patch('search_utils.GOOGLE_SEARCH_AVAILABLE', True)
    @patch('search_utils.GOOGLE_API_KEY', None)
    def test_google_search_no_api_key(self):
        """Test Google search without API key"""
        results = google_search('test query')
        assert results == []

    @patch('search_utils.GOOGLE_SEARCH_AVAILABLE', True)
    @patch('search_utils.GOOGLE_API_KEY', 'test_api_key')
    @patch('search_utils.build')
    def test_google_search_api_error(self, mock_build):
        """Test Google search API error handling"""
        mock_build.side_effect = Exception('API Error')

        results = google_search('test query')
        assert results == []


class TestSimpleRedaction:
    """Test cases for simple redaction fallback"""

    def test_simple_redaction_basic(self):
        """Test basic redaction functionality"""
        search_results = [
            {
                'title': 'Bitcoin cryptocurrency explained',
                'snippet': 'Bitcoin is a digital currency that uses blockchain technology',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['bitcoin', 'cryptocurrency']
        search_query = 'digital currency'

        redacted = simple_redaction(
            search_results, forbidden_words, search_query)

        assert len(redacted) == 1
        assert '[REDACTED]' in redacted[0]['title']
        assert '[REDACTED]' in redacted[0]['snippet']
        # Non-forbidden word preserved
        assert 'explained' in redacted[0]['title']

    def test_simple_redaction_case_insensitive(self):
        """Test case-insensitive redaction"""
        search_results = [
            {
                'title': 'BITCOIN and Bitcoin',
                'snippet': 'bitcoin cryptocurrency',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['bitcoin']
        search_query = ''

        redacted = simple_redaction(
            search_results, forbidden_words, search_query)

        # All variations should be redacted
        assert redacted[0]['title'].count('[REDACTED]') == 2
        assert redacted[0]['snippet'].count('[REDACTED]') == 1

    def test_simple_redaction_preserves_link(self):
        """Test that redaction preserves links"""
        search_results = [
            {
                'title': 'Bitcoin guide',
                'snippet': 'Learn about bitcoin',
                'link': 'https://bitcoin.com',
                'displayLink': 'bitcoin.com'
            }
        ]

        forbidden_words = ['bitcoin']
        search_query = ''

        redacted = simple_redaction(
            search_results, forbidden_words, search_query)

        assert redacted[0]['link'] == 'https://bitcoin.com'
        assert redacted[0]['displayLink'] == 'bitcoin.com'

    def test_simple_redaction_short_words(self):
        """Test that short words (<=2 chars) are not redacted"""
        search_results = [
            {
                'title': 'Go programming language',
                'snippet': 'Go is a great language',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['go', 'is']  # Short words
        search_query = ''

        redacted = simple_redaction(
            search_results, forbidden_words, search_query)

        # Short words should not be redacted
        assert '[REDACTED]' not in redacted[0]['title']
        assert '[REDACTED]' not in redacted[0]['snippet']


class TestRedactWithGemini:
    """Test cases for Gemini AI redaction"""

    @patch('search_utils.GEMINI_AVAILABLE', False)
    def test_gemini_unavailable_fallback(self):
        """Test fallback to simple redaction when Gemini unavailable"""
        search_results = [
            {
                'title': 'Bitcoin guide',
                'snippet': 'Learn about bitcoin',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['bitcoin']
        search_query = 'cryptocurrency'
        secret_topic = 'Bitcoin'

        redacted = redact_with_gemini(
            search_results, forbidden_words, search_query, secret_topic
        )

        # Should use simple redaction as fallback
        assert '[REDACTED]' in redacted[0]['title']

    def test_gemini_redaction_success(self):
        """Test successful Gemini redaction with mocked model"""
        # Create a mock model
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = '''```json
[
  {
    "title": "[REDACTED] guide",
    "snippet": "Learn about [REDACTED]",
    "link": "https://example.com",
    "displayLink": "example.com"
  }
]
```'''
        mock_model.generate_content.return_value = mock_response

        search_results = [
            {
                'title': 'Bitcoin guide',
                'snippet': 'Learn about bitcoin',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['bitcoin']
        search_query = 'cryptocurrency'
        secret_topic = 'Bitcoin'

        # Temporarily patch GEMINI_AVAILABLE and model (create if doesn't exist)
        with patch('search_utils.GEMINI_AVAILABLE', True):
            with patch('search_utils.model', mock_model, create=True):
                redacted = redact_with_gemini(
                    search_results, forbidden_words, search_query, secret_topic
                )

        assert len(redacted) == 1
        assert '[REDACTED]' in redacted[0]['title']
        assert '[REDACTED]' in redacted[0]['snippet']

    def test_gemini_redaction_json_error_fallback(self):
        """Test fallback when Gemini returns invalid JSON"""
        # Create a mock model that returns invalid JSON
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = 'Invalid JSON response'
        mock_model.generate_content.return_value = mock_response

        search_results = [
            {
                'title': 'Bitcoin guide',
                'snippet': 'Learn about bitcoin',
                'link': 'https://example.com',
                'displayLink': 'example.com'
            }
        ]

        forbidden_words = ['bitcoin']
        search_query = 'cryptocurrency'
        secret_topic = 'Bitcoin'

        # Temporarily patch GEMINI_AVAILABLE and model (create if doesn't exist)
        with patch('search_utils.GEMINI_AVAILABLE', True):
            with patch('search_utils.model', mock_model, create=True):
                # Should fallback to simple redaction on error
                redacted = redact_with_gemini(
                    search_results, forbidden_words, search_query, secret_topic
                )

        assert len(redacted) == 1


class TestValidateQueryLogic:
    """Test cases for query validation"""

    def test_validate_query_no_violations(self):
        """Test validation with no forbidden words"""
        query = 'digital currency online'
        forbidden_words = ['bitcoin', 'cryptocurrency']

        result = validate_query_logic(query, forbidden_words)

        assert result['valid'] is True
        assert result['violations'] == []
        assert 'valid' in result['message'].lower()

    def test_validate_query_with_violations(self):
        """Test validation with forbidden words"""
        query = 'what is bitcoin cryptocurrency'
        forbidden_words = ['bitcoin', 'cryptocurrency']

        result = validate_query_logic(query, forbidden_words)

        assert result['valid'] is False
        assert 'bitcoin' in result['violations']
        assert 'cryptocurrency' in result['violations']
        assert len(result['violations']) == 2

    def test_validate_query_case_insensitive(self):
        """Test case-insensitive validation"""
        query = 'What is BITCOIN?'
        forbidden_words = ['bitcoin']

        result = validate_query_logic(query, forbidden_words)

        assert result['valid'] is False
        assert 'bitcoin' in result['violations']

    def test_validate_query_whole_word_match(self):
        """Test whole word matching"""
        query = 'bitcounter is not bitcoin'
        forbidden_words = ['bit']  # Should not match 'bitcounter' or 'bitcoin'

        result = validate_query_logic(query, forbidden_words)

        assert result['valid'] is True
        assert result['violations'] == []

    def test_validate_query_empty_inputs(self):
        """Test validation with empty inputs"""
        result1 = validate_query_logic('', ['bitcoin'])
        result2 = validate_query_logic('test query', [])
        result3 = validate_query_logic('', [])

        assert result1['valid'] is True
        assert result2['valid'] is True
        assert result3['valid'] is True

    def test_validate_query_partial_match(self):
        """Test that partial word matches don't trigger violations"""
        query = 'I love eating pizza'
        # 'moon' should not match 'love' or other words
        forbidden_words = ['moon']

        result = validate_query_logic(query, forbidden_words)

        assert result['valid'] is True


class TestGetRandomTopicData:
    """Test cases for random topic generation"""

    def test_get_random_topic_structure(self):
        """Test that random topic has correct structure"""
        topic_data = get_random_topic_data()

        assert 'topic' in topic_data
        assert 'forbidden_words' in topic_data
        assert isinstance(topic_data['topic'], str)
        assert isinstance(topic_data['forbidden_words'], list)
        assert len(topic_data['topic']) > 0
        assert len(topic_data['forbidden_words']) > 0

    def test_get_random_topic_different_calls(self):
        """Test that multiple calls can return different topics"""
        topics = [get_random_topic_data() for _ in range(10)]

        # Should have valid data
        for topic_data in topics:
            assert 'topic' in topic_data
            assert 'forbidden_words' in topic_data
            assert len(topic_data['forbidden_words']) > 0

        # All topics should be strings
        topic_strings = [t['topic'] for t in topics]
        assert all(isinstance(t, str) for t in topic_strings)

    def test_get_random_topic_forbidden_words_list(self):
        """Test that forbidden words are non-empty list"""
        topic_data = get_random_topic_data()

        # Should have at least a few forbidden words
        assert len(topic_data['forbidden_words']) >= 3
        assert all(isinstance(word, str)
                   for word in topic_data['forbidden_words'])
        assert all(len(word) > 0 for word in topic_data['forbidden_words'])


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
