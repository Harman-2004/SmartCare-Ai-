import sys
import os

# Add the parent directory to the Python path so Vercel can find app.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Flask application instance
from app import app
