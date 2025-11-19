# models.py
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.sqlite import JSON

db = SQLAlchemy()

class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    current_player = db.Column(db.String(10), nullable=False)
    tokens = db.Column(JSON, nullable=False)
    cards = db.Column(JSON, nullable=False)
    scores = db.Column(JSON, nullable=False)
