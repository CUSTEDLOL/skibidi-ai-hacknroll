# Classified Intel Backend

This is the backend for the Classified Intel application, built using FastAPI. The backend serves as the API layer for the React frontend, providing endpoints for data retrieval and manipulation.

## Project Structure

```
classified-intel-backend
├── app
│   ├── __init__.py          # Initializes the app package
│   ├── main.py              # Entry point of the FastAPI application
│   ├── api
│   │   ├── __init__.py      # Initializes the api package
│   │   └── routes.py        # Defines the API routes
│   ├── models
│   │   ├── __init__.py      # Initializes the models package
│   │   └── schemas.py       # Data models and schemas for validation
│   └── services
│       ├── __init__.py      # Initializes the services package
│       └── business_logic.py # Contains the business logic of the application
├── tests
│   ├── __init__.py          # Initializes the tests package
│   └── test_api.py          # Unit tests for the API routes
├── requirements.txt          # Lists the dependencies for the FastAPI application
├── .env                      # Environment variables for configuration
└── README.md                 # Documentation for the project
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd classified-intel-backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the dependencies:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

To run the FastAPI application, execute the following command:
```
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000`.

## API Documentation

The automatically generated API documentation can be accessed at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Testing

To run the tests, use the following command:
```
pytest
```

## Environment Variables

Make sure to configure the necessary environment variables in the `.env` file for your application to run correctly.

## License

This project is licensed under the MIT License.