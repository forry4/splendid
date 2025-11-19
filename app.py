from flask import Flask, jsonify, request, render_template
from game_logic import Game
from db import SessionLocal, GameState, init_db
import json, uuid

app = Flask(__name__)
init_db()

# --- Helpers ---
def save_state(game_id, game):
    session = SessionLocal()
    data = json.dumps(game.to_dict())
    existing = session.query(GameState).filter_by(game_id=game_id).first()
    if existing:
        existing.data = data
    else:
        session.add(GameState(game_id=game_id, data=data))
    session.commit()
    session.close()

def load_state(game_id):
    session = SessionLocal()
    row = session.query(GameState).filter_by(game_id=game_id).first()
    session.close()
    if row:
        data = json.loads(row.data)
        g = Game()
        g.__dict__.update(data)
        return g
    return Game()

# --- Routes ---
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game/new", methods=["POST"])
def new_game():
    game_id = str(uuid.uuid4())  # generate unique ID
    game = Game()
    save_state(game_id, game)
    return jsonify({"game_id": game_id, "state": game.to_dict()})

@app.route("/game/state/<game_id>")
def state(game_id):
    game = load_state(game_id)
    return jsonify(game.to_dict())

@app.route("/game/take_tokens/<game_id>", methods=["POST"])
def take_tokens(game_id):
    data = request.get_json()
    game = load_state(game_id)
    result = game.take_tokens(data["player_id"], data["colors"], data.get("discards"))
    save_state(game_id, game)
    return jsonify(result)

@app.route("/game/reserve/<game_id>", methods=["POST"])
def reserve(game_id):
    data = request.get_json()
    game = load_state(game_id)
    result = game.reserve_card(data["player_id"], data["level"], data["index"], data.get("discards"))
    save_state(game_id, game)
    return jsonify(result)

@app.route("/game/buy/<game_id>", methods=["POST"])
def buy(game_id):
    data = request.get_json()
    game = load_state(game_id)
    result = game.buy_card(data["player_id"], data["level"], data["index"])
    save_state(game_id, game)
    return jsonify(result)

@app.route("/game/buy_reserved/<game_id>", methods=["POST"])
def buy_reserved(game_id):
    data = request.get_json()
    game = load_state(game_id)
    result = game.buy_reserved_card(data["player_id"], data["index"])
    save_state(game_id, game)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
