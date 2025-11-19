function renderGameState(state) {
  // Tokens
  const tokensDiv = document.getElementById("tokens");
  tokensDiv.innerHTML = "";
  for (const [color, count] of Object.entries(state.tokens)) {
    const token = document.createElement("div");
    token.className = `token ${color}`;
    token.innerText = count;
    tokensDiv.appendChild(token);
  }

  // Cards
  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";
  state.cards.forEach(card => {
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
    div.className = "card";
    div.innerHTML = `
      <div><strong>Player ${idx}</strong></div>
      <div>Points: ${player.points}</div>
      <div>Tokens: ${JSON.stringify(player.tokens)}</div>
      <div>Cards: ${player.cards.length}</div>
    `;
    playersDiv.appendChild(div);
  });
}
