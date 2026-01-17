from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import json
import random
from typing import List

app = Flask(__name__)
CORS(app)

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


def get_random_topic_data() -> dict:
    """
    Generate a random topic with forbidden words.
    Returns a dictionary with 'topic' and 'forbidden_words' keys.
    """
    topics = [
        {
            'topic': 'The Moon Landing',
            'forbidden_words': ['moon', 'landing', 'apollo', 'armstrong', 'nasa', 'space']
        },
        {
            'topic': 'Harry Potter',
            'forbidden_words': ['harry', 'potter', 'hogwarts', 'wizard', 'magic', 'rowling']
        },
        {
            'topic': 'The Titanic',
            'forbidden_words': ['titanic', 'ship', 'iceberg', 'sink', 'dicaprio', 'atlantic']
        },
        {
            'topic': 'Bitcoin',
            'forbidden_words': ['bitcoin', 'cryptocurrency', 'blockchain', 'satoshi', 'crypto', 'mining']
        },
        {
            'topic': 'The Eiffel Tower',
            'forbidden_words': ['eiffel', 'tower', 'paris', 'france', 'gustave', 'iron']
        },
        {
            'topic': 'Albert Einstein',
            'forbidden_words': ['einstein', 'relativity', 'physics', 'scientist', 'genius', 'nobel']
        },
        {
            'topic': 'The Great Wall of China',
            'forbidden_words': ['wall', 'china', 'great', 'dynasty', 'beijing', 'ancient']
        },
        {
            'topic': 'The iPhone',
            'forbidden_words': ['iphone', 'apple', 'smartphone', 'jobs', 'ios', 'mobile']
        },
        {
            'topic': 'World War II',
            'forbidden_words': ['war', 'world', 'hitler', 'nazi', 'allies', 'holocaust']
        },
        {
            'topic': 'The Olympics',
            'forbidden_words': ['olympics', 'games', 'medal', 'athlete', 'sports', 'torch']
        }
    ]
    return random.choice(topics)


def validate_query_logic(query: str, forbidden_words: List[str]) -> dict:
    """
    Validate if a query contains forbidden words.
    Returns a dictionary with 'valid' (bool), 'violations' (list), and 'message' (str).
    """
    query_lower = query.lower()
    forbidden_lower = [word.lower() for word in forbidden_words]
    
    violations = []
    for word in forbidden_lower:
        if word in query_lower:
            violations.append(word)
    
    return {
        'valid': len(violations) == 0,
        'violations': violations,
        'message': f"Forbidden words detected: {', '.join(violations)}" if violations else "Query is valid"
    }


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
