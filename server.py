# server.py

# 1. Import necessary modules
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS

# 2. Initialize Flask app
app = Flask(__name__)

# 3. Configure CORS
# This allows your frontend (running on a different port) to communicate with this server.
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:9867"}})

# Define the path for the users file
USERS_FILE = os.path.join(os.path.dirname(__file__), 'users.json')

# 4. File-Based User Storage Functions

def load_users():
    """Reads users from the JSON file."""
    try:
        if not os.path.exists(USERS_FILE):
            # If file doesn't exist, create it with an empty list
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
            return []
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f'Error loading users from file: {e}')
        return [] # Return empty list on error

def save_users(users):
    """Writes the list of users to the JSON file."""
    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2)
    except IOError as e:
        print(f'Error saving users to file: {e}')

# 5. API Routes

# User Registration (Signup)
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required.'}), 400

    users = load_users()
    if any(u['username'] == username for u in users):
        return jsonify({'message': 'Username already exists. Please choose a different one.'}), 409

    # IMPORTANT: Storing plain text password as requested for simplicity.
    # In a real application, you MUST hash passwords.
    users.append({'username': username, 'password': password})
    save_users(users)
    
    return jsonify({'message': 'User registered successfully!'}), 201

# User Login
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required.'}), 400

    users = load_users()
    # Directly compare plain text password
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)

    if not user:
        return jsonify({'message': 'Invalid credentials.'}), 400

    # No JWT token or cookie management, just a success message
    return jsonify({'message': 'Logged in successfully!'})

# 6. Start the server
if __name__ == '__main__':
    # The default port for Flask is 5000. We'll change it to 3000 to match the Node.js server.
    app.run(port=3000, debug=True)