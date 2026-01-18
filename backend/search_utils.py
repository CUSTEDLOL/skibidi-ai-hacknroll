"""
Shared utility functions for search and redaction.
Optimized for speed and token efficiency.
"""
import os
import re
import json
import random
import logging
from flask import Flask
from functools import lru_cache

# Configure logging - when imported, this will use the parent's logging config

app = Flask(__name__)

# API Keys
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GOOGLE_CSE_ID = os.environ.get('GOOGLE_CSE_ID')

# Optional Dependencies
try:
    from googleapiclient.discovery import build
    GOOGLE_SEARCH_AVAILABLE = True
except ImportError:
    GOOGLE_SEARCH_AVAILABLE = False

try:
    import google.genai as genai
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    GEMINI_AVAILABLE = True if gemini_client else False
except ImportError:
    GEMINI_AVAILABLE = False
    gemini_client = None


@lru_cache(maxsize=50)
def google_search(search_term, num_results=5):
    """Perform Google search with local caching for speed."""
    if not (GOOGLE_SEARCH_AVAILABLE and GOOGLE_API_KEY and GOOGLE_CSE_ID):
        # Return mock search results for testing without API keys
        app.logger.warning(f"Google Search API not configured - using mock data for: {search_term}")
        
        # Generate realistic mock results based on search term
        mock_results = []
        search_lower = search_term.lower()
        
        # Topic-specific mock responses for common game topics
        if 'moon' in search_lower or 'lunar' in search_lower or '1969' in search_lower:
            mock_results = [
                {
                    'title': 'Apollo 11 Mission - NASA History',
                    'snippet': 'On July 20, 1969, American astronauts Neil Armstrong and Buzz Aldrin became the first humans to land on the Moon. The historic mission marked a major achievement in space exploration.',
                    'link': 'https://www.nasa.gov/apollo11',
                    'displayLink': 'nasa.gov'
                },
                {
                    'title': 'The Moon Landing: A Giant Leap for Mankind',
                    'snippet': 'The Apollo program successfully landed humans on the lunar surface. Armstrong\'s famous words "That\'s one small step for man" echoed around the world.',
                    'link': 'https://history.com/moon-landing',
                    'displayLink': 'history.com'
                },
                {
                    'title': 'Moon Landing 1969 - Tranquility Base',
                    'snippet': 'The lunar module Eagle touched down in the Sea of Tranquility. The mission was broadcast live on television to millions worldwide.',
                    'link': 'https://space.com/apollo-11',
                    'displayLink': 'space.com'
                },
            ]
        elif 'pizza' in search_lower or 'italian' in search_lower or 'cheese' in search_lower:
            mock_results = [
                {
                    'title': 'History of Pizza - Origins and Evolution',
                    'snippet': 'Pizza originated in Naples, Italy in the 18th century. The classic Margherita pizza was created in 1889, featuring tomatoes, mozzarella cheese, and basil.',
                    'link': 'https://en.wikipedia.org/wiki/Pizza',
                    'displayLink': 'wikipedia.org'
                },
                {
                    'title': 'Traditional Italian Pizza Making',
                    'snippet': 'Authentic Neapolitan pizza uses a thin crust with simple toppings. The dough is made from wheat flour, yeast, water and salt.',
                    'link': 'https://italianfood.com/pizza',
                    'displayLink': 'italianfood.com'
                },
                {
                    'title': 'Popular Pizza Toppings Around the World',
                    'snippet': 'From pepperoni in America to seafood in Japan, pizza has been adapted globally. The classic Italian varieties remain most popular.',
                    'link': 'https://foodnetwork.com/pizza',
                    'displayLink': 'foodnetwork.com'
                },
            ]
        elif 'bitcoin' in search_lower or 'crypto' in search_lower or 'blockchain' in search_lower:
            mock_results = [
                {
                    'title': 'Bitcoin: A Peer-to-Peer Electronic Cash System',
                    'snippet': 'Bitcoin was created in 2009 by an unknown person using the pseudonym Satoshi Nakamoto. It uses blockchain technology for decentralized transactions.',
                    'link': 'https://bitcoin.org/bitcoin.pdf',
                    'displayLink': 'bitcoin.org'
                },
                {
                    'title': 'Understanding Cryptocurrency and Blockchain',
                    'snippet': 'Bitcoin mining involves solving complex mathematical problems to verify transactions. The blockchain ledger records all transactions permanently.',
                    'link': 'https://coindesk.com/learn/bitcoin',
                    'displayLink': 'coindesk.com'
                },
                {
                    'title': 'The Rise of Digital Currency',
                    'snippet': 'Since its creation, Bitcoin has inspired thousands of alternative cryptocurrencies. The technology has revolutionized digital finance.',
                    'link': 'https://investopedia.com/bitcoin',
                    'displayLink': 'investopedia.com'
                },
            ]
        elif 'eiffel' in search_lower or 'paris' in search_lower or 'tower' in search_lower or 'france' in search_lower:
            mock_results = [
                {
                    'title': 'Eiffel Tower - Iconic Paris Landmark',
                    'snippet': 'The Eiffel Tower was built in 1889 for the Paris World\'s Fair. Made of iron, it stands 330 meters tall and was designed by engineer Gustave Eiffel.',
                    'link': 'https://toureiffel.paris/en',
                    'displayLink': 'toureiffel.paris'
                },
                {
                    'title': 'History of the Eiffel Tower in France',
                    'snippet': 'Originally criticized by Parisians, the tower has become a symbol of France. It was the tallest structure in the world until 1930.',
                    'link': 'https://britannica.com/topic/Eiffel-Tower',
                    'displayLink': 'britannica.com'
                },
                {
                    'title': 'Visiting the Iron Lady of Paris',
                    'snippet': 'The Eiffel Tower attracts millions of visitors annually. You can climb stairs or take elevators to observation decks with stunning city views.',
                    'link': 'https://parisinfo.com/eiffel-tower',
                    'displayLink': 'parisinfo.com'
                },
            ]
        else:
            # Generic mock results for any other search
            for i in range(num_results):
                mock_results.append({
                    'title': f'Search result {i+1} for "{search_term}"',
                    'snippet': f'This is a mock search result about {search_term}. In a real scenario, this would contain relevant information from web pages matching your search query.',
                    'link': f'https://example.com/result-{i+1}',
                    'displayLink': 'example.com'
                })
        
        return mock_results[:num_results]

    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        result = service.cse().list(q=search_term, cx=GOOGLE_CSE_ID, num=num_results).execute()

        search_results = []
        for item in result.get('items', []):
            search_results.append({
                'title': item.get('title', ''),
                'snippet': item.get('snippet', ''),
                'link': item.get('link', ''),
                'displayLink': item.get('displayLink', '')
            })
        return search_results
    except Exception as e:
        app.logger.error(f"Search error: {e}")
        return []


def redact_with_gemini(search_results, forbidden_words, search_query, secret_topic):
    """Refine redaction using Gemini by only sending necessary text strings."""
    local_redacted = simple_redaction(
        search_results, forbidden_words, search_query)

    if not GEMINI_AVAILABLE:
        return local_redacted

    text_to_refine = []
    for i, res in enumerate(local_redacted):
        text_to_refine.append(
            {"id": i, "t": res['title'], "s": res['snippet']})

    # Note the double {{ }} below to escape f-string formatting
    prompt = f"""
    Refine redaction for: {secret_topic}. 
    Redact remaining synonyms or giveaways with [REDACTED].
    DATA: {json.dumps(text_to_refine)}
    Return ONLY JSON: [{{ "id": 0, "t": "...", "s": "..." }}]
    """

    try:
        response = gemini_client.models.generate_content(
            model='gemini-1.5-flash',
            content=prompt,
            # Fixed here too
            config={{'response_mime_type': 'application/json'}}
        )

        # Some versions of the SDK return response.text, others response.candidates[0].content.parts[0].text
        # Adding a small check for robustness
        content_text = response.text if hasattr(
            response, 'text') else response.candidates[0].content.parts[0].text

        refined_data = json.loads(content_text)
        for item in refined_data:
            idx = item['id']
            if 0 <= idx < len(local_redacted):
                local_redacted[idx]['title'] = item['t']
                local_redacted[idx]['snippet'] = item['s']
        return local_redacted
    except Exception as e:
        app.logger.error(f"Gemini error: {e}")
        return local_redacted


def simple_redaction(search_results, forbidden_words, search_query):
    """Fast local redaction using compiled Regex."""
    pattern = _get_redaction_pattern(tuple(forbidden_words), search_query)
    if not pattern:
        return search_results

    redacted_results = []
    for result in search_results:
        res = result.copy()
        res['title'] = pattern.sub('[REDACTED]', res.get('title', ''))
        res['snippet'] = pattern.sub('[REDACTED]', res.get('snippet', ''))
        redacted_results.append(res)
    return redacted_results


def identify_redacted_terms(search_results, forbidden_words, search_query, secret_topic):
    """
    REQUIRED BY WEBSOCKET SERVER.
    Identifies positions of terms to be redacted for UI highlighting.
    """
    # Include secret topic in the words to find
    all_forbidden = list(forbidden_words) + [secret_topic]
    pattern = _get_redaction_pattern(tuple(all_forbidden), search_query)

    results_with_indicators = []
    for result in search_results:
        res_copy = result.copy()
        res_copy['redactedTerms'] = {'title': [], 'snippet': []}

        if not pattern:
            results_with_indicators.append(res_copy)
            continue

        for field in ['title', 'snippet']:
            text = result.get(field, '')
            res_copy['redactedTerms'][field] = [
                {'start': m.start(), 'end': m.end(), 'word': m.group()}
                for m in pattern.finditer(text)
            ]
        results_with_indicators.append(res_copy)

    return results_with_indicators


@lru_cache(maxsize=128)
def _get_redaction_pattern(forbidden_tuple, search_query):
    """Helper to compile and cache regex patterns."""
    words = set(forbidden_tuple)
    words.update(search_query.lower().split())
    clean_words = [re.escape(w) for w in words if len(w) > 2]
    if not clean_words:
        return None
    return re.compile(r'\b(' + '|'.join(clean_words) + r')\b', re.IGNORECASE)


def validate_query_logic(query, forbidden_words):
    """Validate query against forbidden list."""
    if not query:
        return {'valid': True, 'violations': []}
    query_lower = query.lower()
    violations = [w for w in forbidden_words if re.search(
        r'\b' + re.escape(w.lower()) + r'\b', query_lower)]
    return {
        'valid': len(violations) == 0,
        'violations': violations,
        'message': f'Forbidden words found: {", ".join(violations)}' if violations else 'Valid'
    }


def verify_guess_with_gemini(guess, topic):
    """
    Verify if a guess matches the secret topic using Gemini for semantic similarity.
    Returns: { "is_correct": bool, "similarity_score": float, "reason": str }
    """
    if not GEMINI_AVAILABLE:
        # Fallback to simple string matching
        is_correct = guess.lower() == topic.lower() or topic.lower() in guess.lower()
        return {
            "is_correct": is_correct,
            "similarity_score": 1.0 if is_correct else 0.0,
            "reason": "Exact match (Gemini unavailable)"
        }

    prompt = f"""
    Compare the guess "{guess}" with the secret topic "{topic}".
    Is the guess semantically close enough to count as a correct answer?
    Allow for synonyms, close variations, or specific parts if the topic is broad.
    
    Return JSON: {{ "is_correct": boolean, "similarity_score": float (0.0-1.0), "reason": "brief explanation" }}
    """

    try:
        response = gemini_client.models.generate_content(
            model='gemini-1.5-flash',
            content=prompt,
            config={'response_mime_type': 'application/json'}
        )

        content_text = response.text if hasattr(
            response, 'text') else response.candidates[0].content.parts[0].text

        result = json.loads(content_text)
        return result
    except Exception as e:
        app.logger.error(f"Gemini verification error: {e}")
        # Fallback
        is_correct = guess.lower() == topic.lower() or topic.lower() in guess.lower()
        return {
            "is_correct": is_correct,
            "similarity_score": 1.0 if is_correct else 0.0,
            "reason": "Fallback check due to error"
        }


def get_random_topic_data():
    """Static list of topics for the game."""
    topics = [
        {'topic': 'Moon Landing', 'forbidden_words': [
            'moon', 'apollo', 'armstrong', 'nasa', 'space', 'lunar']},
        {'topic': 'Pizza', 'forbidden_words': [
            'pizza', 'cheese', 'pepperoni', 'italian', 'dough']},
        {'topic': 'Bitcoin', 'forbidden_words': [
            'bitcoin', 'crypto', 'blockchain', 'satoshi', 'mining']},
        {'topic': 'The Eiffel Tower', 'forbidden_words': [
            'eiffel', 'tower', 'paris', 'france', 'iron']}
    ]
    return random.choice(topics)
