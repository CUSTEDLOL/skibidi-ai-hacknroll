# REDACTED - Classified Intel Game

A multiplayer word guessing game where one player (the Searcher) searches for clues about a secret topic, while the other player (the Guesser) tries to decode redacted search results to uncover the answer.

## How to Play

1. **Create or Join a Room** - One player creates a room and shares the 6-character code
2. **Choose Roles** - One player becomes the Searcher, the other becomes the Guesser
3. **Searcher's Mission** - Search for clues about the secret topic WITHOUT using forbidden words
4. **Guesser's Mission** - Analyze the redacted search results and guess the secret topic
5. **Win Condition** - The Guesser correctly identifies the topic, or runs out of guesses

## Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **shadcn/ui** component library
- **React Router** for navigation

### Backend

- **Flask** (Python) REST API
- **Google Custom Search API** for real search results
- **Google Gemini AI** for intelligent redaction
- **Flask-CORS** for cross-origin support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Google API keys (for search and Gemini)

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:8080`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
# Or use uv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# If using uv: uv pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys
# GOOGLE_API_KEY=your_google_api_key
# GEMINI_API_KEY=your_gemini_api_key

# Start the server
python app.py
# If using uv: uv run python app.py
```

The backend will be available at `http://localhost:5000`

## Testing the Backend

The backend includes comprehensive test coverage for all major components:

### Running Tests

```bash
# Navigate to backend directory
cd backend

# Make sure virtual environment is activated
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install test dependencies (if not already installed)
pip install -r requirements.txt

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run tests with coverage report
pytest --cov=. --cov-report=html

# Run specific test file
pytest test_search_utils.py
pytest test_app.py
pytest test_websocket.py

# Run specific test class or function
pytest test_app.py::TestCreateLobby
pytest test_search_utils.py::TestValidateQueryLogic::test_validate_query_no_violations
```

### Test Files

- **`test_search_utils.py`** - Tests for search, redaction, validation, and topic generation
  - Google Search API mocking
  - Gemini AI redaction testing
  - Query validation logic
  - Topic generation
- **`test_app.py`** - Tests for Flask REST API endpoints
  - Lobby creation and management
  - Player joining
  - Game starting
  - Search endpoints
  - Health checks
- **`test_websocket.py`** - Tests for WebSocket server functionality
  - Room joining/leaving
  - Role selection
  - Real-time game flow
  - Search and guess events

### Coverage Report

After running tests with coverage, open `htmlcov/index.html` in your browser to see a detailed coverage report.

```bash
# Generate coverage report
pytest --cov=. --cov-report=html

# Open coverage report (macOS/Linux)
open htmlcov/index.html

# Open coverage report (Windows)
start htmlcov/index.html
```

### Writing New Tests

When adding new features, follow these testing patterns:

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test API endpoints and WebSocket events
3. **Mocking** - Use `unittest.mock` to mock external APIs (Google Search, Gemini)
4. **Fixtures** - Use pytest fixtures for setup/teardown

Example test structure:

```python
import pytest
from unittest.mock import patch

def test_my_feature():
    # Arrange
    input_data = {'key': 'value'}

    # Act
    result = my_function(input_data)

    # Assert
    assert result['status'] == 'success'
```

## Environment Variables

Create a `.env` file in the `backend` directory:

```env
GOOGLE_API_KEY=your_google_custom_search_api_key
GEMINI_API_KEY=your_google_gemini_api_key
```

## API Endpoints

### Room Management

- `POST /api/rooms` - Create a new game room
- `GET /api/rooms/<room_id>` - Get room information
- `POST /api/rooms/<room_id>/join` - Join a room
- `POST /api/rooms/<room_id>/leave` - Leave a room
- `POST /api/rooms/<room_id>/start` - Start the game
- `POST /api/rooms/<room_id>/search` - Perform a search (Searcher only)
- `POST /api/rooms/<room_id>/guess` - Submit a guess (Guesser only)

### Utility

- `GET /api/topics/random` - Get a random topic
- `POST /api/validate-query` - Validate search query
- `GET /api/health` - Health check

## Project Structure

```
classified-intel/
├── src/
│   ├── components/
│   │   ├── game/          # Game-specific components
│   │   ├── layout/        # Header, Background
│   │   ├── screens/       # Full-page screens
│   │   └── ui/            # Reusable UI components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities
├── backend/
│   ├── app.py             # Flask application
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment template
└── public/                # Static assets
```

## License

MIT License - Feel free to use and modify for your own projects.
