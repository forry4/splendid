let gameId = null;

// --- Core functions ---
async function startGame() {
  const response = await fetch("/game/new", { method: "POST" });
  const data = await response.json();
  gameId = data.game_id;
  localStorage.setItem("gameId", gameId);
  renderGameState(data.state);
}

async function fetchState() {
  if (!gameId) {
    gameId = localStorage.getItem("gameId");
    if (!gameId) {
      alert("No game started yet!");
      return;
    }
  }
  const response = await fetch(`/game/state/${gameId}`);
  const data = await response.json();
  renderGameState(data);
}

// --- Actions ---
async function takeTokens(playerId, colors, discards) {
  const response = await fetch(`/game/take_tokens/${gameId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, colors: colors, discards: discards })
  });
  const data = await response.json();
  renderGameState(data);
}

async function reserveCard(playerId, level, index, discards) {
  const response = await fetch(`/game/reserve/${gameId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, level: level, index: index, discards: discards })
  });
  const data = await response.json();
  renderGameState(data);
}

async function buyCard(playerId, level, index) {
  const response = await fetch(`/game/buy/${gameId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, level: level, index: index })
  });
  const data = await response.json();
  renderGameState(data);
}

async function buyReservedCard(playerId, index) {
  const response = await fetch(`/game/buy_reserved/${gameId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, index: index })
  });
  const data = await response.json();
  renderGameState(data);
}

// --- UI helpers ---
function takeTokensUI() {
  const playerId = parseInt(document.getElementById("playerId").value);
  // Example: take 3 tokens (red, blue, green)
  takeTokens(playerId, ["red", "blue", "green"], null);
}
function reserveCardUI() {
  const playerId = parseInt(document.getElementById("playerId").value);
  reserveCard(playerId, 1, 0, null);
}
function buyCardUI() {
  const playerId = parseInt(document.getElementById("playerId").value);
  buyCard(playerId, 1, 0);
}
function buyReservedCardUI() {
  const playerId = parseInt(document.getElementById("playerId").value);
  buyReservedCard(playerId, 0);
}

// --- Rendering ---
function renderGameState(state) {
  console.log("Rendering state:", state);

  // Tokens
  const tokensDiv = document.getElementById("tokens");
  tokensDiv.innerHTML = "";
  for (const [color, count] of Object.entries(state.tokens)) {
    const token = document.createElement("div");
    token.className = `token ${color}`;
    token.innerText = `${color}: ${count}`;
    tokensDiv.appendChild(token);
  }

  // Cards
  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";
  state.cards.forEach((card, idx) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="points">${card.points}</div>
      <div class="color">${card.color}</div>
      <div class="cost">Cost: ${Object.entries(card.cost).map(([c,v]) => `${c}:${v}`).join(", ")}</div>
    `;
    cardsDiv.appendChild(div);
  });

  // Nobles
  const noblesDiv = document.getElementById("nobles");
  noblesDiv.innerHTML = "";
  state.nobles.forEach(noble => {
    const div = document.createElement("div");
    div.className = "noble";
    div.innerHTML = `
      <div>Points: ${noble.points}</div>
      <div>Req: ${Object.entries(noble.requirements).map(([c,v]) => `${c}:${v}`).join(", ")}</div>
    `;
    noblesDiv.appendChild(div);
  });

  // Players
  const playersDiv = document.getElementById("players");
  playersDiv.innerHTML = "";
  state.players.forEach((player, idx) => {
    const div = document.createElement("div");
    div.className = "player";
    div.innerHTML = `
      <div><strong>Player ${idx}</strong></div>
      <div>Points: ${player.points}</div>
      <div>Tokens: ${JSON.stringify(player.tokens)}</div>
      <div>Cards: ${player.cards.length}</div>
    `;
    playersDiv.appendChild(div);
  });
}

// --- Restore gameId if page refreshed ---
window.onload = () => {
  const savedId = localStorage.getItem("gameId");
  if (savedId) {
    gameId = savedId;
    fetchState();
  }
};
