/* ===== Splendor Frontend =====
   - Assumes Flask endpoints:
     POST /game/new
     GET  /game/state/<gameId>
     POST /game/take_tokens/<gameId>       { player_id, colors:[], discards?:{} }
     POST /game/reserve/<gameId>           { player_id, level, index, discards?:{} }
     POST /game/buy/<gameId>               { player_id, level, index }
     POST /game/buy_reserved/<gameId>      { player_id, index }
   - Supports backend state either:
     {
       tokens:{...},
       cards:[...],            // flat array of visible market cards
       nobles:[...],
       players:[...]
     }
     OR per-level market:
     {
       tokens:{...},
       market:{ 1:[...], 2:[...], 3:[...] },
       nobles:[...],
       players:[...]
     }
*/

let gameId = null;

// Order used for consistent token display
const GEM_ORDER = ["white", "blue", "green", "red", "black", "gold"];

/* ---------- Core ---------- */

async function startGame() {
  try {
    const response = await fetch("/game/new", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to start game");
    gameId = data.game_id;
    localStorage.setItem("gameId", gameId);
    renderGameState(data.state);
  } catch (err) {
    console.error("startGame error:", err);
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
    const response = await fetch(`/game/state/${gameId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch state");
    renderGameState(data);
  } catch (err) {
    console.error("fetchState error:", err);
    alert("Could not fetch game state.");
  }
}

/* ---------- Actions ---------- */

async function takeTokens(playerId, colors, discards) {
  try {
    const response = await fetch(`/game/take_tokens/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, colors, discards })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to take tokens");
    renderGameState(data);
  } catch (err) {
    console.error("takeTokens error:", err);
    alert(err.message);
  }
}

async function reserveCard(playerId, level, index, discards) {
  try {
    const response = await fetch(`/game/reserve/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, level, index, discards })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to reserve card");
    renderGameState(data);
  } catch (err) {
    console.error("reserveCard error:", err);
    alert(err.message);
  }
}

async function buyCard(playerId, level, index) {
  try {
    const response = await fetch(`/game/buy/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, level, index })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to buy card");
    renderGameState(data);
  } catch (err) {
    console.error("buyCard error:", err);
    alert(err.message);
  }
}

async function buyReservedCard(playerId, index) {
  try {
    const response = await fetch(`/game/buy_reserved/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, index })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to buy reserved card");
    renderGameState(data);
  } catch (err) {
    console.error("buyReservedCard error:", err);
    alert(err.message);
  }
}

/* ---------- UI Helpers (wired to your buttons) ---------- */

function takeTokensUI() {
  const playerId = parseInt(document.getElementById("playerId")?.value ?? "0", 10);
  // Simple prompt-based selection for now (pick 3 different or 2 of same).
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

    // Tokens (bank)
    renderTokens(state.tokens);

    // Cards: supports both flat array (state.cards) and per-level market (state.market[level])
    renderMarket(state);

    // Nobles
    renderNobles(state.nobles);

    // Players
    renderPlayers(state.players);

    // Store last state for debugging
    window.__lastState = state;
  } catch (err) {
    console.error("Render error:", err);
    alert("Render failed. See console for details.");
  }
}

/* ----- Render sub-sections ----- */

function renderTokens(tokens) {
  const tokensDiv = document.getElementById("tokens");
  tokensDiv.innerHTML = "";
  // Use GEM_ORDER for consistent ordering; fall back to object order if some missing
  const colors = GEM_ORDER.filter(c => tokens && tokens.hasOwnProperty(c));
  colors.forEach(color => {
    const count = tokens[color];
    const token = document.createElement("div");
    token.className = `token ${color}`;
    token.innerHTML = `<span style="background: rgba(0,0,0,0.65);
                                   color: white;
                                   padding: 2px 6px;
                                   border-radius: 6px;">${count}</span>`;
    tokensDiv.appendChild(token);
  });
}

function renderMarket(state) {
  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  const market = state.market || null;
  const flat = state.cards || null;

  if (market && (market[1] || market[2] || market[3])) {
    // Render per-level rows
    [1, 2, 3].forEach(level => {
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.level = String(level);

      const header = document.createElement("h3");
      header.textContent = `Level ${level}`;
      cardsDiv.appendChild(header);

      (market[level] || []).forEach((card, idx) => {
        const cardEl = buildCardEl(card);
        cardEl.dataset.level = String(level);
        cardEl.dataset.index = String(idx);
        // Click to buy/reserve
        cardEl.addEventListener("click", () => cardClick(level, idx, card));
        row.appendChild(cardEl);
      });

      cardsDiv.appendChild(row);
    });
  } else if (Array.isArray(flat)) {
    // Render a single row for the flat visible market
    const row = document.createElement("div");
    row.className = "row";
    flat.forEach((card, idx) => {
      const cardEl = buildCardEl(card);
      // Assume level is present in card or default to 1
      const level = card.level ?? 1;
      cardEl.dataset.level = String(level);
      cardEl.dataset.index = String(idx);
      cardEl.addEventListener("click", () => cardClick(level, idx, card));
      row.appendChild(cardEl);
    });
    cardsDiv.appendChild(row);
  } else {
    cardsDiv.textContent = "No market data.";
  }
}

function renderNobles(nobles) {
  const noblesDiv = document.getElementById("nobles");
  noblesDiv.innerHTML = "";
  (nobles || []).forEach(noble => {
    const div = document.createElement("div");
    div.className = "noble";
    div.innerHTML = `
      <div>Points: ${noble.points}</div>
      <div>${buildCostHTML(noble.requirements)}</div>
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

    // Small owned cards strip (optional)
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
  // Show icons in GEM_ORDER, then any extras found
  const ordered = GEM_ORDER.filter(c => costObj && costObj[c] > 0);
  const extras = Object.keys(costObj || {}).filter(
    c => !ordered.includes(c) && costObj[c] > 0
  );
  const all = [...ordered, ...extras];
  return all
    .map(c => `<span class="gem-icon gem-${c}"></span>${costObj[c]}`)
    .join(" ");
}

function buildReservedListHTML(reservedArr) {
  if (!Array.isArray(reservedArr) || reservedArr.length === 0) return "—";
  return reservedArr
    .map((card, i) => `[${i}] ${card.color ?? ""}:${card.points ?? 0}`)
    .join(" | ");
}

/* ----- Card click handlers ----- */

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
  // Expose for quick debugging in console
  window._splendor = {
    startGame,
    fetchState,
    takeTokens,
    reserveCard,
    buyCard,
    buyReservedCard
  };
});
