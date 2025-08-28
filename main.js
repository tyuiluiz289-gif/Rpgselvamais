
// Exploração + Arena com economia, armas e missões (corrigido)
const $ = (s) => document.querySelector(s);

const ui = {
  enemyName: $("#enemy-name"),
  enemyLvl: $("#enemy-level"),
  enemyHPBar: $("#enemy-hpbar"),
  enemyHPText: $("#enemy-hptext"),
  enemyImg: $("#enemy-img"),
  playerName: $("#player-name"),
  playerLvl: $("#player-level"),
  playerHPBar: $("#player-hpbar"),
  playerHPText: $("#player-hptext"),
  playerEnBar: $("#player-enbar"),
  playerEnText: $("#player-entext"),
  playerImg: $("#player-img"),
  arenaPlayer: $("#player-arena"),
  arenaEnemy: $("#enemy-arena"),
  backdrop: $("#backdrop"),
  log: $("#log"),
  btnInstall: $("#btn-install"),
  btnExport: $("#btn-export"),
  btnRestart: $("#btn-restart"),
  fileImport: $("#file-import"),
  dialogPortrait: $("#dialog-portrait"),
  dialogText: $("#dialog-text"),
  dialogActions: $("#dialog-actions"),
  readmeLink: $("#readmeLink"),
  coins: $("#coins"),
  weapon: $("#weapon"),
  explore: $("#explore"),
  stage: $("#stage")
};

class Unit {
  constructor(name, level, hp, atk, def, spd, energyMax = 100, img = "") {
    this.name = name;
    this.level = level;
    this.maxHP = hp;
    this.hp = hp;
    this.atk = atk;
    this.def = def;
    this.spd = spd;
    this.energyMax = energyMax;
    this.energy = Math.floor(energyMax * 0.6);
    this.guard = false;
    this.items = 2;
    this.img = img;
  }
  alive() { return this.hp > 0; }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SAVE_KEY = "rpg-turnos-explore-v2";

const NPCS = {
  messi: {
    name: "Narrador",
    img: "imgs/narrator_messi.png",
    lines: [
      "Bem-vindo à aldeia. Gerencie energia, use poções com sabedoria e não subestime ataques rápidos.",
      "Lembre: espada de ferro (+5 dano). Ouro: você SEMPRE age primeiro."
    ]
  },
  pink: {
    name: "Lojista",
    img: "imgs/quest_girl_pink.png",
    lines: [
      "Loja aberta! Ferro por 30 moedas, Ouro por 60. Qual vai levar?",
      "Missão: Derrote um Zumbi na vila vizinha. Pronta pra aceitar?"
    ]
  },
  old: {
    name: "Aldeão",
    img: "imgs/villager_old.png",
    lines: [
      "Os lobos rondam os campos… poderia expulsá-los?",
      "Dizem que um zumbi foi visto à luz vermelha da lua."
    ]
  }
};

const ENEMIES = {
  goblin_a: { name: "Goblin Verde A", img: "imgs/goblin_a.png", bg: "imgs/bg_school.png", drop: 5 },
  goblin_b: { name: "Goblin Verde B", img: "imgs/goblin_b.png", bg: "imgs/bg_school.png", drop: 5 },
  goblin_c: { name: "Goblin Verde C", img: "imgs/goblin_c.png", bg: "imgs/bg_school.png", drop: 5 },
  wolf:     { name: "Lobo da Mata",   img: "imgs/wolf.png",      bg: "imgs/bg_forest.png", drop: 2 },
  zombie:   { name: "Zumbi da Lua",   img: "imgs/zombie.png",    bg: "imgs/bg_bloodmoon.png", drop: 6 },
  miniboss: { name: "Mini Boss",      img: "imgs/miniboss_brutamontes.png", bg: "imgs/bg_bloodmoon.png", drop: 9 }
};

const RANDOM_POOL = [
  ["wolf", 5],
  ["goblin_a", 2],
  ["goblin_b", 2],
  ["goblin_c", 2],
  ["zombie", 1],
  ["miniboss", 0.5]
];

function pickRandom(pool) {
  const total = pool.reduce((s, it) => s + it[1], 0);
  let r = Math.random() * total;
  for (const [k, w] of pool) {
    r -= w;
    if (r <= 0) return k;
  }
  return pool[0][0];
}

let state = null;

function defaultState() {
  return {
    mode: "explore",
    battle: 1,
    coins: 0,
    weapon: "none", // none | iron | gold
    bossKills: 0,
    mission: null,  // {type:"wolf"|"zombie", need:N, done:0}
    player: new Unit("Você", 1, 80, 12, 6, 10, 100, "imgs/player_portrait.png"),
    enemy: null,
    log: ["Você chega à aldeia. O narrador te observa em silêncio."],
    npcIndex: { messi: 0, pink: 0, old: 0 }
  };
}

function spawnEnemy(kind) {
  const cfg = ENEMIES[kind];
  const b = Math.max(1, state.battle);
  const hp = 50 + b * 10 + (kind === "miniboss" ? 30 : 0);
  const atk = 8 + b * 2 + (kind === "miniboss" ? 3 : 0);
  const def = 4 + Math.floor(b * 1.2) + (kind === "miniboss" ? 2 : 0);
  const spd = 8 + Math.floor(b * 0.6) + (kind === "wolf" ? 1 : 0);
  const e = new Unit(cfg.name, b, hp, atk, def, spd, 70, cfg.img);
  e.drop = cfg.drop;
  e.kind = kind;
  e.bg = cfg.bg;
  return e;
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw);
    if (p.player) p.player = Object.assign(new Unit(), p.player);
    if (p.enemy) p.enemy = Object.assign(new Unit(), p.enemy);
    return p;
  } catch (e) {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function setMode(m) {
  state.mode = m;
  ui.explore.style.display = (m === "explore") ? "" : "none";
  ui.stage.style.display = (m === "battle") ? "" : "none";
}

function startBattle(kind) {
  state.enemy = spawnEnemy(kind);
  setMode("battle");
  renderAll();
  writeLog(`⚠️ Você encontrou ${state.enemy.name}!`);
  save();
}

function writeLog(t) {
  state.log.push(t);
  ui.log.textContent = state.log.slice(-12).join("\\n");
}

function finishBattleVictory() {
  const coins = state.enemy.drop || 0;
  state.coins += coins;
  writeLog(`🪙 Você ganhou ${coins} moedas.`);
  if (state.enemy.kind === "miniboss") {
    state.bossKills += 1;
    if (state.bossKills >= 10) {
      writeLog("🏁 Você derrotou o Mini Boss 10 vezes. A aldeia está em paz… (Fim oculto).");
    }
  }
  state.battle += 1;
  if (state.mission) {
    if (state.mission.type === "wolf" && state.enemy.kind === "wolf") state.mission.done++;
    if (state.mission.type === "zombie" && state.enemy.kind === "zombie") state.mission.done++;
    if (state.mission.done >= state.mission.need) {
      writeLog(`✔️ Missão concluída: ${state.mission.type}. Volte ao NPC para novas tarefas.`);
      state.mission = null;
    }
  }
  state.player.hp = Math.min(state.player.maxHP, state.player.hp + 10);
  setMode("explore");
  renderAll();
  save();
}

function setBar(div, pct) {
  div.style.width = Math.max(0, Math.min(100, pct)) + "%";
}

function renderAll() {
  if (state.enemy) {
    ui.enemyName.textContent = state.enemy.name;
    ui.enemyLvl.textContent = `Nv. ${state.enemy.level}`;
    ui.enemyHPText.textContent = `${state.enemy.hp}/${state.enemy.maxHP}`;
    setBar(ui.enemyHPBar, (state.enemy.hp / state.enemy.maxHP) * 100);
    ui.enemyImg.src = state.enemy.img;
    ui.arenaEnemy.src = state.enemy.img;
    ui.backdrop.style.backgroundImage = `url('${state.enemy.bg}')`;
  } else {
    ui.enemyName.textContent = "—";
    ui.enemyLvl.textContent = "Nv. —";
    ui.enemyHPText.textContent = "--/--";
    setBar(ui.enemyHPBar, 0);
    ui.enemyImg.src = "";
    ui.arenaEnemy.src = "";
    ui.backdrop.style.backgroundImage = "none";
  }

  ui.playerName.textContent = state.player.name;
  ui.playerLvl.textContent = `Nv. ${state.player.level}`;
  ui.playerHPText.textContent = `${state.player.hp}/${state.player.maxHP}`;
  setBar(ui.playerHPBar, (state.player.hp / state.player.maxHP) * 100);
  ui.playerEnText.textContent = `${state.player.energy}/${state.player.energyMax}`;
  setBar(ui.playerEnBar, (state.player.energy / state.player.energyMax) * 100);
  ui.playerImg.src = state.player.img;
  ui.arenaPlayer.src = state.player.img;

  ui.coins.textContent = state.coins;
  ui.weapon.textContent = (state.weapon === "iron") ? "Espada de Ferro" :
                          (state.weapon === "gold") ? "Espada de Ouro" : "Nenhuma";
}

function calcDamage(attacker, base, defender) {
  let dmg = base + Math.max(0, Math.floor(attacker.atk * 0.2) - Math.floor(defender.def * 0.1));
  return Math.max(1, dmg);
}

function endTurnRegen(u) {
  u.guard = false;
  u.energy = Math.min(u.energyMax, u.energy + 10);
}

function enemyAct() {
  if (!state.enemy || !state.enemy.alive()) return;
  const dmg = Math.max(1, Math.floor(state.enemy.atk * 0.8) - Math.floor(state.player.def * 0.3));
  state.player.hp = Math.max(0, state.player.hp - dmg);
  writeLog(`👾 ${state.enemy.name} atacou: ${dmg} de dano.`);
}

function playerActsFirst(move) {
  if (state.weapon === "gold") return true;
  if (move === "quick") return true;
  return false;
}

function applyPlayerMove(move) {
  if (move === "item") {
    if (state.player.items <= 0) {
      writeLog("⚠️ Sem poções.");
      return;
    }
    state.player.items--;
    const heal = 30;
    state.player.hp = Math.min(state.player.maxHP, state.player.hp + heal);
    writeLog(`🧪 Poção: +${heal} HP. (${state.player.items} restantes)`);
    return;
  }
  if (move === "flee") {
    const ok = Math.random() < 0.6;
    if (ok) {
      writeLog("🏃 Você fugiu com sucesso.");
      setMode("explore");
      renderAll();
      save();
      return "fled";
    } else {
      writeLog("❌ Falha ao fugir.");
      return;
    }
  }
  let base = (move === "quick") ? 3 : 7;
  if (state.weapon === "iron") base += 5;
  const dmg = calcDamage(state.player, base, state.enemy);
  state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
  writeLog((move === "quick") ? `⚡ Rápido causou ${dmg}.` : `🪓 Pesado causou ${dmg}.`);
  return;
}

function resolveTurn(move) {
  if (state.mode !== "battle" || !state.enemy) return;
  if (!state.player.alive()) {
    writeLog("💀 Você caiu.");
    return;
  }

  const firstPlayer = playerActsFirst(move);
  if (firstPlayer) {
    const res = applyPlayerMove(move);
    if (res === "fled") return;
    if (state.enemy.alive()) {
      enemyAct();
    }
  } else {
    enemyAct();
    if (state.player.alive()) {
      const res = applyPlayerMove(move);
      if (res === "fled") return;
    }
  }

  endTurnRegen(state.player);
  endTurnRegen(state.enemy);

  if (!state.player.alive()) {
    writeLog("💀 Derrota. Volte à aldeia para se preparar melhor.");
    setMode("explore");
  } else if (!state.enemy.alive()) {
    writeLog(`✅ ${state.enemy.name} foi derrotado!`);
    finishBattleVictory();
  }

  renderAll();
  save();
}

function clearDialogActions() {
  ui.dialogActions.innerHTML = "";
}

function addActionButton(label, handler) {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = "btn";
  b.addEventListener("click", handler);
  ui.dialogActions.appendChild(b);
}

function speak(who) {
  clearDialogActions();
  const npc = (who === "messi") ? NPCS.messi : (who === "pink") ? NPCS.pink : NPCS.old;
  const key = who;
  const idx = state.npcIndex[key] || 0;
  ui.dialogPortrait.src = npc.img;
  ui.dialogText.textContent = npc.lines[idx % npc.lines.length];
  state.npcIndex[key] = idx + 1;

  if (who === "pink") {
    addActionButton("Comprar Ferro (30)", () => buy("iron", 30));
    addActionButton("Comprar Ouro (60)", () => buy("gold", 60));
    addActionButton("Aceitar missão Zumbi (1)", () => acceptMission("zombie", 1));
  }
  if (who === "old") {
    addActionButton("Aceitar missão Lobos (3)", () => acceptMission("wolf", 3));
  }

  save();
}

function buy(kind, cost) {
  if (state.coins < cost) {
    ui.dialogText.textContent = "Moedas insuficientes.";
    return;
  }
  state.coins -= cost;
  state.weapon = kind;
  ui.dialogText.textContent = (kind === "iron")
    ? "Você equipa a Espada de Ferro (+5 dano)."
    : "Você equipa a Espada de Ouro (atua primeiro).";
  renderAll();
  save();
}

function acceptMission(type, need) {
  state.mission = { type, need, done: 0 };
  ui.dialogText.textContent = (type === "wolf") ? "Missão: mate 3 lobos." : "Missão: derrote 1 zumbi.";
  save();
}

function bindExplore() {
  document.querySelectorAll(".place").forEach((p) => {
    p.addEventListener("click", () => {
      const act = p.dataset.act;
      if (act === "talk-messi") speak("messi");
      if (act === "talk-pink") speak("pink");
      if (act === "talk-old") speak("old");
    });
  });

  document.querySelectorAll(".go").forEach((g) => {
    g.addEventListener("click", () => {
      const enc = g.dataset.enc;
      if (enc === "wolf") startBattle("wolf");
      else if (enc === "zombie") startBattle("zombie");
      else startBattle(pickRandom(RANDOM_POOL));
    });
  });
}

function bindCombat() {
  document.querySelectorAll(".cmd").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.mode !== "battle") {
        writeLog("Você não está em combate.");
        return;
      }
      resolveTurn(b.dataset.action);
    });
  });
}

function exportSave() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "save-rpg-explore.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importSave(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const p = JSON.parse(reader.result);
      p.player = Object.assign(new Unit(), p.player);
      if (p.enemy) p.enemy = Object.assign(new Unit(), p.enemy);
      state = p;
      setMode(state.mode || "explore");
      renderAll();
      writeLog("✔️ Save importado.");
      save();
    } catch (e) {
      writeLog("❌ Arquivo inválido.");
    }
  };
  reader.readAsText(file);
}

function bindSystem() {
  ui.btnExport.addEventListener("click", exportSave);
  ui.fileImport.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) importSave(f);
  });
  ui.btnRestart.addEventListener("click", () => {
    state = defaultState();
    setMode("explore");
    renderAll();
    save();
    writeLog("Jogo reiniciado.");
  });
  if (ui.readmeLink) {
    ui.readmeLink.addEventListener("click", (e) => {
      e.preventDefault();
      alert("README no repositório explica como publicar.");
    });
  }
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  ui.btnInstall.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("Instale pelo menu do navegador.");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}

function boot() {
  state = load();
  if (!state) state = defaultState();
  setMode(state.mode || "explore");
  renderAll();
  bindExplore();
  bindCombat();
  bindSystem();
  save();
}

boot();
