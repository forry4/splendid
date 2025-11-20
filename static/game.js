/* ===== Splendor Frontend (full game.js) =====
   Backend endpoints expected:
     POST /game/new
     GET  /game/state/<gameId>
     POST /game/take_tokens/<gameId>       { player_id, colors:[], discards?:{} }
     POST /game/reserve/<gameId>           { player_id, level, index, discards?:{} }
     POST /game/buy/<gameId>               { player_id, level, index }
     POST /game/buy_reserved/<gameId>      { player_id, index }

   Backend state shape expected from Game.to_dict():
     {
       tokens: { white, blue, green, red, black, gold },
       cards: [ { color, points, cost:{...}, level? }, ... ],     // visible market cards
       nobles: [ { points, requirements:{...} }, ... ],
       players: [
         { points, tokens:{...}, cards:[...], reserved:[...]? },
         ...
       ]
     }
*/

let gameId = null;

// Consistent ordering for token display
const GEM_ORDER = ["white", "blue", "green", "red", "black", "gold"];

/* ---------- Core ---------- */

async function startGame() {
  try {
    const res = await fetch("/game/new", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start game");
    gameId = data.game_id;
    localStorage.setItem("gameId", gameId);
    renderGameState(data.state);
  } catch (err) {
    console.error("startGame:", err);
    alert("Could not start a new game.");
  }
}

async function fetchState() {
  try {
    if (!gameId) {
      gameId = localStorage.getItem("gameId");
      if (!gameId) {
        alert("No game started yet!");
        return;
      }
    }
    const res = await fetch(`/game/state/${gameId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch state");
    renderGameState(data);
  } catch (err) {
    console.error("fetchState:", err);
    alert("Could not fetch game state.");
  }
}

/* ---------- Actions ---------- */

async function takeTokens(playerId, colors, discards) {
  try {
    const res = await fetch(`/game/take_tokens/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, colors, discards })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to take tokens");
    renderGameState(data);
  } catch (err) {
    console.error("takeTokens:", err);
    alert(err.message);
  }
}

async function reserveCard(playerId, level, index, discards) {
  try {
    const res = await fetch(`/game/reserve/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, level, index, discards })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reserve card");
    renderGameState(data);
  } catch (err) {
    console.error("reserveCard:", err);
    alert(err.message);
  }
}

async function buyCard(playerId, level, index) {
  try {
    const res = await fetch(`/game/buy/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, level, index })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to buy card");
    renderGameState(data);
  } catch (err) {
    console.error("buyCard:", err);
    alert(err.message);
  }
}

async function buyReservedCard(playerId, index) {
  try {
    const res = await fetch(`/game/buy_reserved/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, index })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to buy reserved card");
    renderGameState(data);
  } catch (err) {
    console.error("buyReservedCard:", err);
    alert(err.message);
  }
}

/* ---------- UI Helpers (bind these to your buttons) ---------- */

function takeTokensUI() {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  const input = prompt("Enter colors to take (comma-separated). Example: red,blue,green or blue,blue");
  if (!input) return;
  const colors = input.split(",").map(s => s.trim()).filter(Boolean);
  takeTokens(playerId, colors, null);
}

function reserveCardUI() {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  const level = parseInt(prompt("Enter level (1,2,3):") || "1", 10);
  const index = parseInt(prompt("Enter card index in that row (0-based):") || "0", 10);
  reserveCard(playerId, level, index, null);
}

function buyCardUI() {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  const level = parseInt(prompt("Enter level (1,2,3):") || "1", 10);
  const index = parseInt(prompt("Enter card index in that row (0-based):") || "0", 10);
  buyCard(playerId, level, index);
}

function buyReservedCardUI() {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  const index = parseInt(prompt("Enter reserved card index (0-based):") || "0", 10);
  buyReservedCard(playerId, index);
}

/* ---------- Rendering ---------- */

function renderGameState(state) {
  try {
    console.log("Rendering state:", state);

    // Bank tokens
    renderTokens(state.tokens);

    // Market cards (flat array from backend)
    renderMarket(state.cards);

    // Nobles
    renderNobles(state.nobles);

    // Players
    renderPlayers(state.players);

    window.__lastState = state;
  } catch (err) {
    console.error("Render error:", err);
    alert("Render failed. See console for details.");
  }
}

/* ----- Render helpers ----- */

function renderTokens(tokens) {
  const tokensDiv = document.getElementById("tokens");
  tokensDiv.innerHTML = "";
  GEM_ORDER.forEach(color => {
    if (tokens && tokens[color] !== undefined) {
      const count = tokens[color];
      const token = document.createElement("div");
      token.className = `token ${color}`;
      token.innerHTML = `<span style="background: rgba(0,0,0,0.65);
                                   color: white;
                                   padding: 2px 6px;
                                   border-radius: 6px;">${count}</span>`;
      tokensDiv.appendChild(token);
    }
  });
}

function renderMarket(cards) {
  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  if (!Array.isArray(cards) || cards.length === 0) {
    cardsDiv.textContent = "No market cards.";
    return;
  }

  const row = document.createElement("div");
  row.className = "row";

  cards.forEach((card, idx) => {
    const el = buildCardEl(card);
    const level = card.level ?? 1;
    el.dataset.level = String(level);
    el.dataset.index = String(idx);
    el.addEventListener("click", () => cardClick(level, idx, card));
    row.appendChild(el);
  });

  cardsDiv.appendChild(row);
}

function renderNobles(nobles) {
  const noblesDiv = document.getElementById("nobles");
  noblesDiv.innerHTML = "";
  (nobles || []).forEach(noble => {
    const div = document.createElement("div");
    div.className = "noble";
    div.innerHTML = `
      <div>Points: ${noble.points ?? 0}</div>
      <div>${buildCostHTML(noble.requirements || {})}</div>
    `;
    noblesDiv.appendChild(div);
  });
}

function renderPlayers(players) {
  const playersDiv = document.getElementById("players");
  playersDiv.innerHTML = "";
  (players || []).forEach((player, idx) => {
    const div = document.createElement("div");
    div.className = "player";

    const tokensHTML = buildCostHTML(player.tokens || {});
    const reservedHTML = buildReservedListHTML(player.reserved || []);

    const ownedStrip = document.createElement("div");
    ownedStrip.className = "player-cards";
    (player.cards || []).forEach(card => {
      const mini = document.createElement("div");
      mini.className = "card";
      mini.style.width = "90px";
      mini.style.height = "120px";
      mini.innerHTML = `
        <div class="points">${card.points ?? 0}</div>
        <div class="color">${card.color ?? ""}</div>
      `;
      ownedStrip.appendChild(mini);
    });

    div.innerHTML = `
      <div><strong>Player ${idx}</strong></div>
      <div>Points: ${player.points ?? 0}</div>
      <div class="player-tokens">${tokensHTML}</div>
      <div>Reserved: ${reservedHTML}</div>
      <div>Cards: ${(player.cards || []).length}</div>
    `;

    div.appendChild(ownedStrip);
    playersDiv.appendChild(div);
  });
}

/* ----- Builders ----- */

function buildCardEl(card) {
  const div = document.createElement("div");
  div.className = "card";
  const costHTML = buildCostHTML(card.cost || {});
  div.innerHTML = `
    <div class="points">${card.points ?? 0}</div>
    <div class="color">${card.color ?? ""}</div>
    <div class="cost">${costHTML}</div>
  `;
  return div;
}

function buildCostHTML(costObj) {
  const ordered = GEM_ORDER.filter(c => costObj && Number(costObj[c]) > 0);
  const extras = Object.keys(costObj || {}).filter(
    c => !ordered.includes(c) && Number(costObj[c]) > 0
  );
  const all = [...ordered, ...extras];
  return all.map(c => `<span class="gem-icon gem-${c}"></span>${costObj[c]}`).join(" ");
}

function buildReservedListHTML(reservedArr) {
  if (!Array.isArray(reservedArr) || reservedArr.length === 0) return "—";
  return reservedArr
    .map((card, i) => `[${i}] ${card.color ?? ""}:${card.points ?? 0}`)
    .join(" | ");
}

/* ----- Card click handler ----- */

function cardClick(level, index, card) {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  const choice = prompt(
    `Card ${card.color ?? ""}:${card.points ?? 0}\n` +
    `Cost: ${Object.entries(card.cost || {}).map(([c,v]) => `${c}:${v}`).join(", ")}\n\n` +
    `Type 'buy' to buy, 'reserve' to reserve.`
  );
  if (!choice) return;
  if (choice.toLowerCase() === "buy") {
    buyCard(playerId, level, index);
  } else if (choice.toLowerCase() === "reserve") {
    reserveCard(playerId, level, index, null);
  }
}

/* ---------- Bootstrap ---------- */

window.addEventListener("load", () => {
  console.log("✅ game.js loaded!");
  const savedId = localStorage.getItem("gameId");
  if (savedId) {
    gameId = savedId;
    fetchState();
  }
  // Expose for quick debugging
  window._splendor = {
    startGame,
    fetchState,
    takeTokens,
    reserveCard,
    buyCard,
    buyReservedCard
  };
});
