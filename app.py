from flask import Flask, jsonify, request, render_template
from game_logic import Game

app = Flask(__name__)
game = Game()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game/state")
def state():
    return jsonify(game.to_dict())

@app.route("/game/take_tokens", methods=["POST"])
def take_tokens():
    data = request.get_json()
    return jsonify(game.take_tokens(data["player_id"], data["colors"], data.get("discards")))

@app.route("/game/reserve", methods=["POST"])
def reserve():
    data = request.get_json()
    return jsonify(game.reserve_card(data["player_id"], data["level"], data["index"], data.get("discards")))

@app.route("/game/buy", methods=["POST"])
def buy():
    data = request.get_json()
    return jsonify(game.buy_card(data["player_id"], data["level"], data["index"]))

@app.route("/game/buy_reserved", methods=["POST"])
def buy_reserved():
    data = request.get_json()
    return jsonify(game.buy_reserved_card(data["player_id"], data["index"]))

if __name__ == "__main__":
    app.run(debug=True)
