"""
Shared utility functions for search and redaction.
Used by both app.py and websocket_server.py
"""
import os
import re
import json
import random
import logging

# Configure logging
logging.basicConfig(
    filename='search_utils.log',
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
)
logger = logging.getLogger(__name__)

# API Keys (add these to environment variables)
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GOOGLE_CSE_ID = os.environ.get('GOOGLE_CSE_ID')

# Try to import Google APIs (optional dependencies)
try:
    from googleapiclient.discovery import build
    GOOGLE_SEARCH_AVAILABLE = True
except ImportError:
    GOOGLE_SEARCH_AVAILABLE = False
    logger.warning(
        "google-api-python-client not installed. Google Search will not work.")

try:
    import google.genai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
    GEMINI_AVAILABLE = GEMINI_API_KEY is not None
except ImportError:
    GEMINI_AVAILABLE = False
    model = None
    logger.warning(
        "google-genai not installed. Gemini redaction will not work.")


def google_search(search_term, num_results=5):
    """
    Perform Google search using Custom Search API
    Returns list of results with title, snippet, link
    """
    if not GOOGLE_SEARCH_AVAILABLE:
        return []

    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        logger.warning("GOOGLE_API_KEY or GOOGLE_CSE_ID not set")
        return []

    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        result = service.cse().list(
            q=search_term,
            cx=GOOGLE_CSE_ID,
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
        logger.error(f"Search error: {e}")
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
            redacted_text = redacted_text.split(
                '```json')[1].split('```')[0].strip()
        elif '```' in redacted_text:
            redacted_text = redacted_text.split(
                '```')[1].split('```')[0].strip()

        redacted_results = json.loads(redacted_text)
        return redacted_results
    except Exception as e:
        logger.error(f"Gemini redaction error: {e}")
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


def identify_redacted_terms(search_results, forbidden_words, search_query, secret_topic):
    """
    Identify which terms should be redacted and their positions in the text.
    Returns results with redaction indicators for partial redaction display.
    """
    logger.debug("identify_redacted_terms called")
    logger.debug(f"Secret topic: {secret_topic}")
    logger.debug(f"Forbidden words: {forbidden_words}")
    logger.debug(f"Search query: {search_query}")
    logger.debug(f"Number of results: {len(search_results)}")

    results_with_indicators = []

    # Combine all words to redact
    words_to_redact = set()
    words_to_redact.update(word.lower()
                           for word in forbidden_words if len(word) > 2)
    words_to_redact.update(word.lower()
                           for word in search_query.split() if len(word) > 2)
    words_to_redact.add(secret_topic.lower())

    logger.debug(f"Words to redact: {words_to_redact}")

    for result in search_results:
        result_copy = result.copy()
        result_copy['redactedTerms'] = {'title': [], 'snippet': []}

        # Find redacted terms in title and snippet
        for field in ['title', 'snippet']:
            if field not in result:
                continue

            text = result[field]
            redacted_positions = []

            # Find all occurrences of words to redact
            for word in words_to_redact:
                pattern = re.compile(
                    r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
                for match in pattern.finditer(text):
                    redacted_positions.append({
                        'start': match.start(),
                        'end': match.end(),
                        'word': match.group()
                    })

            # Sort by position
            redacted_positions.sort(key=lambda x: x['start'])
            result_copy['redactedTerms'][field] = redacted_positions

        results_with_indicators.append(result_copy)

    return results_with_indicators


def validate_query_logic(query, forbidden_words):
    """
    Validate if a search query contains forbidden words
    Returns validation result with violations
    """
    if not query or not forbidden_words:
        return {
            'valid': True,
            'violations': [],
            'message': 'Query is valid'
        }

    query_lower = query.lower()
    violations = []

    for word in forbidden_words:
        word_lower = word.lower()
        # Check if forbidden word appears in query (whole word match)
        pattern = r'\b' + re.escape(word_lower) + r'\b'
        if re.search(pattern, query_lower):
            violations.append(word)

    return {
        'valid': len(violations) == 0,
        'violations': violations,
        'message': f'Query contains forbidden words: {", ".join(violations)}' if violations else 'Query is valid'
    }


def get_random_topic_data():
    """
    Generate a random topic with forbidden words
    Returns a dictionary with topic and forbidden_words
    """
    topics = [
        {
            'topic': 'Moon Landing',
            'forbidden_words': ['moon', 'apollo', 'armstrong', 'nasa', 'space', 'lunar', 'astronaut']
        },
        {
            'topic': 'Pizza',
            'forbidden_words': ['pizza', 'cheese', 'pepperoni', 'italian', 'dough', 'slice']
        },
        {
            'topic': 'Bitcoin',
            'forbidden_words': ['bitcoin', 'crypto', 'blockchain', 'satoshi', 'mining', 'wallet']
        },
        {
            'topic': 'Harry Potter',
            'forbidden_words': ['harry', 'potter', 'hogwarts', 'voldemort', 'wizard', 'magic']
        },
        {
            'topic': 'The Eiffel Tower',
            'forbidden_words': ['eiffel', 'tower', 'paris', 'france', 'landmark', 'iron']
        },
        {
            'topic': 'The Beatles',
            'forbidden_words': ['beatles', 'lennon', 'mccartney', 'band', 'music', 'rock']
        },
        {
            'topic': 'The Internet',
            'forbidden_words': ['internet', 'web', 'online', 'network', 'digital', 'cyber']
        },
        {
            'topic': 'Mount Everest',
            'forbidden_words': ['everest', 'mountain', 'himalaya', 'summit', 'climb', 'peak']
        },
        {
            'topic': 'The Mona Lisa',
            'forbidden_words': ['mona', 'lisa', 'da vinci', 'painting', 'louvre', 'art']
        },
        {
            'topic': 'The Great Wall of China',
            'forbidden_words': ['wall', 'china', 'great', 'ancient', 'fortification', 'ming']
        }
    ]

    selected = random.choice(topics)
    return {
        'topic': selected['topic'],
        'forbidden_words': selected['forbidden_words']
    }
