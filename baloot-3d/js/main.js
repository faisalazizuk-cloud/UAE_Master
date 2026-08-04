import * as THREE from 'three';
import { createScene } from './scene.js';
import { createCardMesh, CARD_H } from './cards.js';
import * as B from './baloot.js';
import * as AI from './ai.js';

const { renderer, scene, camera } = createScene(document.getElementById('c'));

// ---------- tween engine ----------
const tweens = [];
function tweenTo(mesh, pos, quat, dur = 0.45, delay = 0) {
  return new Promise((resolve) => {
    tweens.push({
      mesh, fromP: mesh.position.clone(), toP: pos.clone(),
      fromQ: mesh.quaternion.clone(), toQ: quat.clone(),
      t: -delay, dur, resolve,
    });
  });
}
function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    w.t += dt;
    if (w.t < 0) continue;
    const k = Math.min(w.t / w.dur, 1);
    const e = easeInOut(k);
    w.mesh.position.lerpVectors(w.fromP, w.toP, e);
    w.mesh.quaternion.copy(w.fromQ).slerp(w.toQ, e);
    if (k >= 1) { tweens.splice(i, 1); w.resolve(); }
  }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- seat layout ----------
const TABLE_Y = 0.02;
// Each seat: center of fan, spread axis, base rotation (euler), faceUp.
const euler = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const SEATS = [
  { name: 'South', center: new THREE.Vector3(0, TABLE_Y, 3.7), axis: 'x', dir: 1, rot: euler(-Math.PI / 2, 0, 0), faceUp: true, fan: 0.10 },
  { name: 'West', center: new THREE.Vector3(-4.7, TABLE_Y, 0), axis: 'z', dir: -1, rot: euler(Math.PI / 2, Math.PI / 2, 0), faceUp: false, fan: 0.06 },
  { name: 'North', center: new THREE.Vector3(0, TABLE_Y, -3.7), axis: 'x', dir: -1, rot: euler(Math.PI / 2, 0, 0), faceUp: false, fan: 0.06 },
  { name: 'East', center: new THREE.Vector3(4.7, TABLE_Y, 0), axis: 'z', dir: 1, rot: euler(Math.PI / 2, -Math.PI / 2, 0), faceUp: false, fan: 0.06 },
];

function handTransform(pos, idx, count) {
  const seat = SEATS[pos];
  const spread = pos === 0 ? 0.92 : 0.62;
  const off = (idx - (count - 1) / 2);
  const t = new THREE.Vector3().copy(seat.center);
  if (seat.axis === 'x') t.x += off * spread * seat.dir;
  else t.z += off * spread * seat.dir;
  t.y += idx * 0.004; // avoid z-fight
  // slight arc toward player for South
  if (pos === 0) t.z += Math.abs(off) * 0.10;
  const q = seat.rot.clone();
  if (pos === 0) q.multiply(euler(0, 0, -off * seat.fan)); // fan
  return { pos: t, quat: q };
}

// ---------- game state ----------
const state = {
  scoreA: 0, scoreB: 0, target: 152,
  dealer: 3,
  hands: [[], [], [], []],
  meshes: new Map(),
  rest: [],
  flipped: null,
  contract: null,
  trick: [], turn: 0, leader: 0,
  raw: { A: 0, B: 0 },
  lastWinner: null,
  handNo: 0,
};

function meshFor(card) {
  let m = state.meshes.get(card.id);
  if (!m) { m = createCardMesh(card); state.meshes.set(card.id, m); scene.add(m); }
  return m;
}

async function layoutHand(pos, animate = true) {
  const hand = state.hands[pos];
  const jobs = [];
  hand.forEach((card, i) => {
    const m = meshFor(card);
    const { pos: p, quat } = handTransform(pos, i, hand.length);
    m.userData.owner = pos;
    m.renderOrder = i;
    if (animate) jobs.push(tweenTo(m, p, quat, 0.4, i * 0.03));
    else { m.position.copy(p); m.quaternion.copy(quat); }
  });
  if (animate) await Promise.all(jobs);
}

// ---------- UI helpers ----------
const ui = {
  scoreA: document.getElementById('scoreA'),
  scoreB: document.getElementById('scoreB'),
  contract: document.getElementById('contract'),
  msg: document.getElementById('msg'),
  bid: document.getElementById('bidPanel'),
  bidBtns: document.getElementById('bidBtns'),
  bidTitle: document.getElementById('bidTitle'),
  turnDots: [0, 1, 2, 3].map(i => document.getElementById('turn' + i)),
  overlay: document.getElementById('overlay'),
};
function setMsg(html) { ui.msg.innerHTML = html; }
function updateScores() {
  ui.scoreA.textContent = state.scoreA;
  ui.scoreB.textContent = state.scoreB;
}
function updateContract() {
  if (!state.contract) { ui.contract.textContent = '\u2014'; return; }
  const c = state.contract;
  const who = c.declarerTeam === 'A' ? '\u0644\u0646\u0627' : '\u0639\u0644\u064a\u0646\u0627';
  if (c.mode === 'sun') ui.contract.textContent = `\u0635\u0646 (${who})`;
  else ui.contract.textContent = `\u062d\u0643\u0645 ${B.SUIT_SYMBOL[c.trump]} (${who})`;
}
function highlightTurn(pos) {
  ui.turnDots.forEach((d, i) => d.classList.toggle('active', i === pos));
}

// ---------- input ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pickResolver = null;
let legalIds = new Set();

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!pickResolver) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...state.hands[0].map(c => meshFor(c))], false);
  for (const h of hits) {
    const card = h.object.userData.card;
    if (card && legalIds.has(card.id)) { const r = pickResolver; pickResolver = null; clearHighlights(); r(card); return; }
  }
});

let hovered = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!pickResolver) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...state.hands[0].map(c => meshFor(c))], false);
  const hit = hits.find(h => legalIds.has(h.object.userData.card?.id))?.object || null;
  if (hovered && hovered !== hit) { hovered.position.z -= 0; }
  hovered = hit;
  renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
});

function highlightLegal(cards) {
  legalIds = new Set(cards.map(c => c.id));
  for (const card of state.hands[0]) {
    const m = meshFor(card);
    const legal = legalIds.has(card.id);
    m.material.forEach?.(() => {});
    const front = m.material[4];
    front.emissive = new THREE.Color(legal ? '#2e7d32' : '#000000');
    front.emissiveIntensity = legal ? 0.25 : 0;
    m.position.y = legal ? 0.16 : (m.userData.owner === 0 ? TABLE_Y : m.position.y);
  }
}
function clearHighlights() {
  legalIds = new Set();
  for (const card of state.hands[0]) {
    const m = meshFor(card);
    const front = m.material[4];
    front.emissive = new THREE.Color('#000'); front.emissiveIntensity = 0;
  }
}
function waitForHumanCard(legal) {
  highlightLegal(legal);
  return new Promise((resolve) => { pickResolver = resolve; });
}

// ---------- bidding UI ----------
function askHumanBid(round, flipped) {
  return new Promise((resolve) => {
    ui.bid.classList.add('show');
    ui.bidTitle.textContent = round === 1
      ? `\u0627\u0644\u0645\u0632\u0627\u064a\u062f\u0629 \u2014 \u0627\u0644\u0648\u0631\u0642\u0629: ${flipped.rank}${B.SUIT_SYMBOL[flipped.suit]}`
      : '\u0627\u0644\u062c\u0648\u0644\u0629 \u0627\u0644\u062b\u0627\u0646\u064a\u0629';
    ui.bidBtns.innerHTML = '';
    const opts = round === 1
      ? [['\u062d\u0643\u0645', 'hokom'], ['\u0635\u0646', 'sun'], ['\u0628\u0633 (\u0645\u0631\u0631)', 'pass']]
      : [
          ['\u062d\u0643\u0645 \u2660', 'spades'], ['\u062d\u0643\u0645 \u2665', 'hearts'],
          ['\u062d\u0643\u0645 \u2666', 'diamonds'], ['\u062d\u0643\u0645 \u2663', 'clubs'],
          ['\u0635\u0646', 'sun'], ['\u0628\u0633 (\u0645\u0631\u0631)', 'pass'],
        ];
    for (const [label, val] of opts) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.onclick = () => { ui.bid.classList.remove('show'); resolve(val); };
      ui.bidBtns.appendChild(btn);
    }
  });
}

// ---------- game flow ----------
async function startMatch() {
  state.scoreA = 0; state.scoreB = 0; state.dealer = 3; state.handNo = 0;
  updateScores();
  await dealNewHand();
}

async function dealNewHand() {
  // reset
  for (const m of state.meshes.values()) scene.remove(m);
  state.meshes.clear();
  state.hands = [[], [], [], []];
  state.trick = []; state.raw = { A: 0, B: 0 }; state.contract = null; state.lastWinner = null;
  state.handNo++;
  updateContract();
  highlightTurn(-1);

  const deck = B.shuffle(B.makeDeck());
  // deal 5 to each (3 then 2), flip one, keep 3 leftover per player order handled after bid
  let idx = 0;
  const order = [0, 1, 2, 3].map(i => (state.dealer + 1 + i) % 4);
  for (const p of order) state.hands[p].push(...deck.slice(idx, idx + 3)), idx += 3;
  for (const p of order) state.hands[p].push(...deck.slice(idx, idx + 2)), idx += 2;
  state.flipped = deck[idx++];
  state.rest = deck.slice(idx); // 11 cards: 3*3 for players + 2 to declarer? handled below
  state.restIndex = 0;

  setMsg(`\u062a\u0648\u0632\u064a\u0639 \u062c\u062f\u064a\u062f \u2014 \u0627\u0644\u0645\u0648\u0632\u0639: ${SEATS[state.dealer].name}`);
  for (let p = 0; p < 4; p++) await layoutHand(p, true);

  // show flipped card at center
  const fm = meshFor(state.flipped);
  fm.position.set(0, 0.05, 0.8);
  fm.quaternion.copy(euler(-Math.PI / 2, 0, 0));

  await bidding();
}

async function bidding() {
  const flipped = state.flipped;
  const order = [0, 1, 2, 3].map(i => (state.dealer + 1 + i) % 4);
  let contract = null;

  for (let round = 1; round <= 2 && !contract; round++) {
    for (const p of order) {
      highlightTurn(p);
      let choice;
      if (p === 0) {
        setMsg('\u062f\u0648\u0631\u0643 \u0641\u064a \u0627\u0644\u0645\u0632\u0627\u064a\u062f\u0629');
        choice = await askHumanBid(round, flipped);
      } else {
        await sleep(650);
        choice = AI.decideBid(state.hands[p], flipped, round);
        setMsg(`${SEATS[p].name}: ${bidLabel(choice)}`);
        await sleep(400);
      }
      if (choice === 'pass') continue;
      if (choice === 'sun') { contract = { mode: 'sun', trump: null, declarer: p, declarerTeam: B.teamOf(p) }; break; }
      if (choice === 'hokom') {
        const trump = round === 1 ? flipped.suit : (p === 0 ? flipped.suit : AI.bestTrumpSuit(state.hands[p]));
        contract = { mode: 'hokom', trump, declarer: p, declarerTeam: B.teamOf(p) }; break;
      }
      // round 2 explicit suit chosen by human
      if (B.SUITS.includes(choice)) {
        contract = { mode: 'hokom', trump: choice, declarer: p, declarerTeam: B.teamOf(p) }; break;
      }
    }
    if (!contract && round === 1) setMsg('\u0627\u0644\u062c\u0645\u064a\u0639 \u0645\u0631\u0631 \u2014 \u0627\u0644\u062c\u0648\u0644\u0629 \u0627\u0644\u062b\u0627\u0646\u064a\u0629');
  }

  if (!contract) { // everyone passed twice: redeal
    setMsg('\u0644\u0627 \u0623\u062d\u062f \u0623\u062e\u0630 \u2014 \u0625\u0639\u0627\u062f\u0629 \u062a\u0648\u0632\u064a\u0639');
    await sleep(900);
    state.dealer = (state.dealer + 1) % 4;
    return dealNewHand();
  }

  state.contract = contract;
  updateContract();

  // declarer takes the flipped card, then deal 3 more to everyone (declarer already has it -> 2 more logic simplified: everyone gets 3, declarer keeps flipped)
  state.hands[contract.declarer].push(state.flipped);
  const rest = state.rest;
  let ri = 0;
  const order2 = [0, 1, 2, 3].map(i => (state.dealer + 1 + i) % 4);
  for (const p of order2) {
    const need = 8 - state.hands[p].length;
    state.hands[p].push(...rest.slice(ri, ri + need)); ri += need;
  }
  // move flipped mesh into declarer hand visually via relayout
  setMsg(`\u0627\u0644\u0639\u0642\u062f: ${state.contract.mode === 'sun' ? '\u0635\u0646' : '\u062d\u0643\u0645 ' + B.SUIT_SYMBOL[contract.trump]} \u2014 ${SEATS[contract.declarer].name}`);
  for (let p = 0; p < 4; p++) { sortHand(p); await layoutHand(p, true); }

  state.leader = (state.dealer + 1) % 4;
  await playHand();
}

function bidLabel(c) {
  return c === 'hokom' ? '\u062d\u0643\u0645' : c === 'sun' ? '\u0635\u0646' : '\u0628\u0633';
}

function sortHand(pos) {
  const c = state.contract;
  const suitRank = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  state.hands[pos].sort((a, b) => {
    if (a.suit !== b.suit) return suitRank[a.suit] - suitRank[b.suit];
    return B.cardStrength(b, a.suit, c) - B.cardStrength(a, a.suit, c);
  });
}

async function playHand() {
  for (let t = 0; t < 8; t++) {
    await playTrick(t === 7);
  }
  await endHand();
}

async function playTrick(isLast) {
  state.trick = [];
  const order = [0, 1, 2, 3].map(i => (state.leader + i) % 4);
  for (const p of order) {
    highlightTurn(p);
    const hand = state.hands[p];
    const legal = B.legalMoves(hand, state.trick, state.contract, p);
    let card;
    if (p === 0) {
      setMsg('\u0627\u0644\u0639\u0628 \u0648\u0631\u0642\u0629');
      card = await waitForHumanCard(legal);
    } else {
      await sleep(600);
      card = AI.chooseCard(legal, state.trick, state.contract, p);
    }
    // remove from hand
    state.hands[p] = state.hands[p].filter(c => c.id !== card.id);
    state.trick.push({ pos: p, card });
    await playToCenter(p, card, state.trick.length);
    await layoutHand(p, true);
  }
  // resolve
  const winner = B.trickWinner(state.trick, state.contract);
  let pts = state.trick.reduce((s, t) => s + B.cardPoints(t.card, state.contract), 0);
  if (isLast) pts += 10; // last trick bonus (Ard)
  state.raw[B.teamOf(winner)] += pts;
  state.lastWinner = winner;
  highlightTurn(winner);
  setMsg(`${SEATS[winner].name} \u0643\u0633\u0628 \u0627\u0644\u064a\u062f (+${pts})`);
  await sleep(650);
  await collectTrick(winner);
  state.leader = winner;
}

async function playToCenter(pos, card, n) {
  const m = meshFor(card);
  const spot = [new THREE.Vector3(0, 0.05, 1.0), new THREE.Vector3(-1.0, 0.05, 0), new THREE.Vector3(0, 0.05, -1.0), new THREE.Vector3(1.0, 0.05, 0)][pos];
  const q = euler(-Math.PI / 2, 0, (Math.random() - 0.5) * 0.3);
  m.renderOrder = 50 + n;
  m.position.y += 0.2;
  await tweenTo(m, spot, q, 0.4);
}

async function collectTrick(winner) {
  const target = SEATS[winner].center.clone().multiplyScalar(1.4);
  target.y = 0.02;
  const jobs = [];
  for (const t of state.trick) {
    const m = meshFor(t.card);
    jobs.push(tweenTo(m, target, euler(Math.PI / 2, 0, 0), 0.35));
  }
  await Promise.all(jobs);
  for (const t of state.trick) scene.remove(meshFor(t.card));
  state.trick = [];
}

async function endHand() {
  // baloot bonus
  let balootTeam = null;
  if (state.contract.mode === 'hokom') {
    for (let p = 0; p < 4; p++) {
      // check original 8-card holdings: reconstruct not tracked; approximate via meshes removed.
    }
  }
  // Detect baloot from who played K & Q of trump is complex; award if declarer team likely. Simplify: skip unless tracked.
  const result = B.scoreHand(state.raw, state.contract, balootTeam);
  state.scoreA += result.A; state.scoreB += result.B;
  updateScores();

  const line = result.note === 'down'
    ? '\u0642\u0647\u0648\u0629! \u0627\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0632\u0627\u064a\u062f \u0648\u0642\u0639'
    : '\u0627\u0646\u062a\u0647\u062a \u0627\u0644\u064a\u062f';
  setMsg(`${line} \u2014 \u0644\u0646\u0627 +${result.A} / \u0639\u0644\u064a\u0646\u0627 +${result.B}`);
  await sleep(1600);

  if (state.scoreA >= state.target || state.scoreB >= state.target) {
    const win = state.scoreA >= state.scoreB;
    showEnd(win);
    return;
  }
  state.dealer = (state.dealer + 1) % 4;
  await dealNewHand();
}

function showEnd(playerWon) {
  ui.overlay.innerHTML = `
    <div class="card-panel">
      <h1>${playerWon ? '\u0641\u0632\u062a! \ud83c\udfc6' : '\u062e\u0633\u0631\u062a'}</h1>
      <p>\u0644\u0646\u0627 ${state.scoreA} \u2014 \u0639\u0644\u064a\u0646\u0627 ${state.scoreB}</p>
      <button id="again">\u0644\u0639\u0628\u0629 \u062c\u062f\u064a\u062f\u0629</button>
    </div>`;
  ui.overlay.classList.add('show');
  document.getElementById('again').onclick = () => {
    ui.overlay.classList.remove('show'); ui.overlay.innerHTML = '';
    startMatch();
  };
}

// ---------- render loop ----------
let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  updateTweens(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// start
document.getElementById('startBtn').onclick = () => {
  ui.overlay.classList.remove('show'); ui.overlay.innerHTML = '';
  startMatch();
};
