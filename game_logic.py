# game_logic.py
import random
from typing import Dict, List, Optional

Color = str  # "red", "green", "blue", "black", "white", "gold"


class Game:
    def __init__(self):
        # Players and turn
        self.players = ["A", "B"]
        self.current_player = "A"

        # Token pool (including gold tokens)
        self.tokens: Dict[Color, int] = {
            "red": 7, "green": 7, "blue": 7, "black": 7, "white": 7, "gold": 5
        }

        # Player token inventories
        self.player_tokens: Dict[str, Dict[Color, int]] = {
            "A": {c: 0 for c in self.tokens},
            "B": {c: 0 for c in self.tokens},
        }

        # Player permanent discounts (from purchased cards)
        self.discounts: Dict[str, Dict[Color, int]] = {
            "A": {c: 0 for c in ["red", "green", "blue", "black", "white"]},
            "B": {c: 0 for c in ["red", "green", "blue", "black", "white"]},
        }

        # Scores
        self.scores: Dict[str, int] = {"A": 0, "B": 0}

        # Reserved cards per player (max 3)
        self.reserved: Dict[str, List[dict]] = {"A": [], "B": []}

        # Track number of purchased cards (for tie-breaker)
        self.cards_bought = {"A": 0, "B": 0}

        # Sample decks (to be replaced with full decks)
        self.level1_deck = [
            {"level": 1, "color": "red",   "points": 0, "cost": {"green": 1, "blue": 1}},
            {"level": 1, "color": "green", "points": 0, "cost": {"red": 2, "black": 1}},
            {"level": 1, "color": "blue",  "points": 0, "cost": {"white": 1, "red": 1}},
            {"level": 1, "color": "black", "points": 0, "cost": {"blue": 2}},
            {"level": 1, "color": "white", "points": 0, "cost": {"red": 1, "green": 1}},
        ]
        self.level2_deck = [
            {"level": 2, "color": "black", "points": 1, "cost": {"green": 2, "blue": 2}},
            {"level": 2, "color": "white", "points": 2, "cost": {"red": 3, "black": 2}},
            {"level": 2, "color": "red",   "points": 1, "cost": {"blue": 3, "white": 2}},
        ]
        self.level3_deck = [
            {"level": 3, "color": "red",   "points": 4, "cost": {"green": 6, "blue": 3}},
            {"level": 3, "color": "blue",  "points": 5, "cost": {"black": 7, "white": 4}},
            {"level": 3, "color": "white", "points": 3, "cost": {"red": 5, "black": 3}},
        ]

        # Shuffle decks
        random.shuffle(self.level1_deck)
        random.shuffle(self.level2_deck)
        random.shuffle(self.level3_deck)

        # Draw pointers for replenishment (after initial 4 face-up)
        self.draw_ptr = {1: 4, 2: 4, 3: 4}

        # Deal 4 face-up cards per level
        self.face_up = {
            1: self.level1_deck[:4],
            2: self.level2_deck[:4],
            3: self.level3_deck[:4],
        }

        # Nobles (to be expanded)
        self.nobles = [
            {"points": 3, "requirement": {"red": 4, "green": 4, "blue": 4}},
            {"points": 3, "requirement": {"black": 4, "white": 4, "red": 4}},
            {"points": 3, "requirement": {"green": 3, "blue": 3, "white": 3}},
            {"points": 3, "requirement": {"black": 3, "blue": 3, "red": 3}},
        ]
        random.shuffle(self.nobles)
        self.active_nobles = self.nobles[:3]

        # Endgame tracking
        self.win_points = 15
        self.winner: Optional[str] = None
        self.end_round_triggered = False
        self.final_round_player: Optional[str] = None

    def total_tokens(self, player_id: str) -> int:
        return sum(self.player_tokens[player_id].values())

    def discard_tokens(self, player_id: str, discards: Dict[Color, int]):
        for color, amount in discards.items():
            if amount < 0:
                return {"error": "Discard amount must be non-negative"}
            if self.player_tokens[player_id][color] < amount:
                return {"error": f"Cannot discard {amount} {color} tokens"}
        for color, amount in discards.items():
            self.player_tokens[player_id][color] -= amount
            self.tokens[color] += amount
        return self.to_dict()

    def _advance_turn(self):
        self.current_player = "B" if self.current_player == "A" else "A"
        # If end-round was triggered and we have completed the round (back to trigger player), decide winner
        if self.end_round_triggered and self.current_player == self.final_round_player and not self.winner:
            self._decide_winner()

    def _deck_for_level(self, level: int) -> List[dict]:
        return getattr(self, f"level{level}_deck")

    def _replenish_face_up(self, level: int):
        """Replenish a face-up slot from the same level deck, if possible."""
        deck = self._deck_for_level(level)
        ptr = self.draw_ptr[level]
        if ptr < len(deck) and len(self.face_up[level]) < 4:
            self.face_up[level].append(deck[ptr])
            self.draw_ptr[level] += 1

    def take_tokens(self, player_id: str, colors: List[Color], discards: Optional[Dict[Color, int]] = None):
        if self.winner:
            return {"error": f"Game over. Winner: {self.winner}"}
        if player_id != self.current_player:
            return {"error": "Not your turn!"}

        if len(colors) == 3 and len(set(colors)) == 3:
            if any(self.tokens[c] <= 0 for c in colors):
                return {"error": "One or more colors unavailable"}
            for c in colors:
                self.tokens[c] -= 1
                self.player_tokens[player_id][c] += 1
        elif len(colors) == 2 and colors[0] == colors[1]:
            c = colors[0]
            if c == "gold":
                return {"error": "Cannot take gold via take_tokens; gold is only via reserve"}
            if self.tokens[c] < 4:
                return {"error": f"Not enough {c} tokens to take 2"}
            self.tokens[c] -= 2
            self.player_tokens[player_id][c] += 2
        else:
            return {"error": "Invalid token selection"}

        # Enforce 10-token limit via discards
        if self.total_tokens(player_id) > 10:
            if not discards:
                return {"error": "Must discard tokens to reach 10 or fewer"}
            self.discard_tokens(player_id, discards)
            if self.total_tokens(player_id) > 10:
                return {"error": "Still above 10 after discards"}

        self._advance_turn()
        return self.to_dict()

    def reserve_card(self, player_id: str, level: int, index: int, discards: Optional[Dict[Color, int]] = None):
        if self.winner:
            return {"error": f"Game over. Winner: {self.winner}"}
        if player_id != self.current_player:
            return {"error": "Not your turn!"}
        if level not in self.face_up or index < 0 or index >= len(self.face_up[level]):
            return {"error": "Invalid card index"}
        if len(self.reserved[player_id]) >= 3:
            return {"error": "You can only reserve up to 3 cards"}

        # Move card to reserved
        card = self.face_up[level].pop(index)
        self.reserved[player_id].append(card)

        # Replenish the face-up row
        self._replenish_face_up(level)

        # Take gold if available
        if self.tokens["gold"] > 0:
            self.tokens["gold"] -= 1
            self.player_tokens[player_id]["gold"] += 1

        # Enforce 10-token limit via discards
        if self.total_tokens(player_id) > 10:
            if not discards:
                return {"error": "Must discard tokens to reach 10 or fewer"}
            self.discard_tokens(player_id, discards)
            if self.total_tokens(player_id) > 10:
                return {"error": "Still above 10 after discards"}

        self._advance_turn()
        return self.to_dict()

    def can_afford(self, player_id: str, card: dict) -> bool:
        total_gold_needed = 0
        for color, cost in card["cost"].items():
            effective_cost = max(0, cost - self.discounts[player_id][color])
            colored = self.player_tokens[player_id][color]
            if colored < effective_cost:
                total_gold_needed += (effective_cost - colored)
        return total_gold_needed <= self.player_tokens[player_id]["gold"]

    def pay_for_card(self, player_id: str, card: dict):
        for color, cost in card["cost"].items():
            effective_cost = max(0, cost - self.discounts[player_id][color])
            available = self.player_tokens[player_id][color]
            if available >= effective_cost:
                self.player_tokens[player_id][color] -= effective_cost
                self.tokens[color] += effective_cost
            else:
                shortage = effective_cost - available
                # Pay available colored tokens
                self.tokens[color] += available
                self.player_tokens[player_id][color] = 0
                # Cover shortage with gold
                self.player_tokens[player_id]["gold"] -= shortage
                self.tokens["gold"] += shortage

    def buy_card(self, player_id: str, level: int, index: int):
        if self.winner:
            return {"error": f"Game over. Winner: {self.winner}"}
        if player_id != self.current_player:
            return {"error": "Not your turn!"}
        if level not in self.face_up or index < 0 or index >= len(self.face_up[level]):
            return {"error": "Invalid card selection"}

        card = self.face_up[level][index]
        if not self.can_afford(player_id, card):
            return {"error": "Cannot afford this card"}

        # Pay and apply effects
        self.pay_for_card(player_id, card)
        self.scores[player_id] += card["points"]
        self.discounts[player_id][card["color"]] += 1
        self.cards_bought[player_id] += 1

        # Remove and replenish
        self.face_up[level].pop(index)
        self._replenish_face_up(level)

        # Nobles
        self._award_nobles(player_id)

        # Trigger end-round if needed
        if self.scores[player_id] >= self.win_points and not self.end_round_triggered:
            self.end_round_triggered = True
            self.final_round_player = player_id

        self._advance_turn()
        return self.to_dict()

    def buy_reserved_card(self, player_id: str, index: int):
        if self.winner:
            return {"error": f"Game over. Winner: {self.winner}"}
        if player_id != self.current_player:
            return {"error": "Not your turn!"}
        if index < 0 or index >= len(self.reserved[player_id]):
            return {"error": "Invalid reserved card index"}

        card = self.reserved[player_id][index]
        if not self.can_afford(player_id, card):
            return {"error": "Cannot afford this reserved card"}

        # Pay and apply effects
        self.pay_for_card(player_id, card)
        self.scores[player_id] += card["points"]
        self.discounts[player_id][card["color"]] += 1
        self.cards_bought[player_id] += 1

        # Remove from reserved
        self.reserved[player_id].pop(index)

        # Nobles
        self._award_nobles(player_id)

        # Trigger end-round if needed
        if self.scores[player_id] >= self.win_points and not self.end_round_triggered:
            self.end_round_triggered = True
            self.final_round_player = player_id

        self._advance_turn()
        return self.to_dict()

    def _award_nobles(self, player_id: str) -> List[dict]:
        earned: List[dict] = []
        for noble in list(self.active_nobles):
            if all(self.discounts[player_id].get(color, 0) >= req
                   for color, req in noble["requirement"].items()):
                self.scores[player_id] += noble["points"]
                self.active_nobles.remove(noble)
                earned.append(noble)
        return earned

    def _decide_winner(self):
        # Highest points wins; ties break by fewer cards bought
        a_pts, b_pts = self.scores["A"], self.scores["B"]
        if a_pts > b_pts:
            self.winner = "A"
        elif b_pts > a_pts:
            self.winner = "B"
        else:
            a_cards, b_cards = self.cards_bought["A"], self.cards_bought["B"]
            if a_cards < b_cards:
                self.winner = "A"
            elif b_cards < a_cards:
                self.winner = "B"
            else:
                self.winner = "Tie"

    def to_dict(self):
        return {
            "players": self.players,
            "current_player": self.current_player,
            "winner": self.winner,
            "tokens": self.tokens,
            "player_tokens": self.player_tokens,
            "discounts": self.discounts,
            "scores": self.scores,
            "reserved": self.reserved,
            "face_up": self.face_up,
            "active_nobles": self.active_nobles,
            "win_points": self.win_points,
            "end_round_triggered": self.end_round_triggered,
            "final_round_player": self.final_round_player,
            "cards_bought": self.cards_bought,
        }
