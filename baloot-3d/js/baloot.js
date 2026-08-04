// Baloot game logic (rules, deck, bidding, trick-taking, scoring).
// Pure logic, no rendering. Positions: 0=South(you), 1=West, 2=North(partner), 3=East.
// Teams: A = {0,2} (You & North), B = {1,3} (West & East).

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOL = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
export const SUIT_AR = { spades: '\u0628\u0633\u062a\u0648\u0646\u064a', hearts: '\u0643\u0648\u0628\u0629', diamonds: '\u062f\u064a\u0646\u0627\u0631\u064a', clubs: '\u0633\u064a\u0646\u0643' };
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Order strength (higher = stronger) and point value, for the two contexts.
const HOKOM_TRUMP_ORDER = { J: 8, '9': 7, A: 6, '10': 5, K: 4, Q: 3, '8': 2, '7': 1 };
const HOKOM_TRUMP_POINTS = { J: 20, '9': 14, A: 11, '10': 10, K: 4, Q: 3, '8': 0, '7': 0 };
const PLAIN_ORDER = { A: 8, '10': 7, K: 6, Q: 5, J: 4, '9': 3, '8': 2, '7': 1 };
const PLAIN_POINTS = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0 };

export function teamOf(pos) { return pos % 2 === 0 ? 'A' : 'B'; }
export function partnerOf(pos) { return (pos + 2) % 4; }

export function makeDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank, id: `${rank}_${suit}` });
  return deck;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Is a card the trump suit? (only meaningful in Hokom)
export function isTrump(card, contract) {
  return contract.mode === 'hokom' && card.suit === contract.trump;
}

// Strength of a card within a trick, given lead suit and contract. Higher wins.
export function cardStrength(card, leadSuit, contract) {
  if (contract.mode === 'hokom') {
    if (card.suit === contract.trump) return 200 + HOKOM_TRUMP_ORDER[card.rank];
    if (card.suit === leadSuit) return 100 + PLAIN_ORDER[card.rank];
    return PLAIN_ORDER[card.rank]; // off-suit, cannot win
  }
  // sun
  if (card.suit === leadSuit) return 100 + PLAIN_ORDER[card.rank];
  return PLAIN_ORDER[card.rank];
}

export function cardPoints(card, contract) {
  if (contract.mode === 'hokom' && card.suit === contract.trump) return HOKOM_TRUMP_POINTS[card.rank];
  return PLAIN_POINTS[card.rank];
}

// Legal moves for a hand given the current trick (Baloot follow-suit + trumping rules, simplified but faithful).
export function legalMoves(hand, trick, contract, currentPos) {
  if (trick.length === 0) return hand.slice();
  const leadSuit = trick[0].card.suit;
  const hasLead = hand.some(c => c.suit === leadSuit);

  if (contract.mode === 'sun') {
    // Must follow suit if possible; otherwise anything.
    return hasLead ? hand.filter(c => c.suit === leadSuit) : hand.slice();
  }

  // Hokom rules.
  const trump = contract.trump;
  // current winning card in the trick
  const winning = trick.reduce((best, t) =>
    cardStrength(t.card, leadSuit, contract) > cardStrength(best.card, leadSuit, contract) ? t : best, trick[0]);
  const winningIsTrump = winning.card.suit === trump;

  if (leadSuit === trump) {
    // Following trump lead: must play trump if possible, and must over-trump if able.
    const trumps = hand.filter(c => c.suit === trump);
    if (trumps.length === 0) return hand.slice();
    const higher = trumps.filter(c => cardStrength(c, leadSuit, contract) > cardStrength(winning.card, leadSuit, contract));
    return higher.length ? higher : trumps;
  }

  if (hasLead) return hand.filter(c => c.suit === leadSuit); // follow suit
  // Void in lead suit: must trump if partner isn't already winning; over-trump if forced.
  const trumps = hand.filter(c => c.suit === trump);
  if (trumps.length === 0) return hand.slice();
  const partnerWinning = teamOf(winning.pos) === teamOf(currentPos);
  if (partnerWinning) return hand.slice(); // partner winning: free to discard
  if (winningIsTrump) {
    const higher = trumps.filter(c => cardStrength(c, leadSuit, contract) > cardStrength(winning.card, leadSuit, contract));
    return higher.length ? higher : hand.slice();
  }
  return trumps; // must cut
}

export function trickWinner(trick, contract) {
  const leadSuit = trick[0].card.suit;
  return trick.reduce((best, t) =>
    cardStrength(t.card, leadSuit, contract) > cardStrength(best.card, leadSuit, contract) ? t : best, trick[0]).pos;
}

// Detect Baloot (K+Q of trump) held by a player. Only in Hokom.
export function hasBaloot(hand, contract) {
  if (contract.mode !== 'hokom') return false;
  return hand.some(c => c.suit === contract.trump && c.rank === 'K') &&
         hand.some(c => c.suit === contract.trump && c.rank === 'Q');
}

// Convert raw card points to game points. Hokom divides by 10, Sun by 5 (doubling).
function toGame(raw, mode) {
  return Math.round(raw / (mode === 'sun' ? 5 : 10));
}

// Final scoring for a completed hand.
// raw = { A, B } card points incl. last-trick bonus (+10). balootBonus = 'A'|'B'|null.
// Returns { A, B, note } game points to add to the match score.
export function scoreHand(raw, contract, balootBonus) {
  const declarer = contract.declarerTeam;
  const defender = declarer === 'A' ? 'B' : 'A';
  let a = raw.A, b = raw.B;

  // Baloot bonus (K+Q of trump = 20 raw), Hokom only.
  if (balootBonus && contract.mode === 'hokom') { if (balootBonus === 'A') a += 20; else b += 20; }

  const total = a + b;
  const declarerRaw = declarer === 'A' ? a : b;
  const result = { A: 0, B: 0, note: '' };

  // Declarer must take strictly more than half the raw points, else defenders sweep ("qahwa").
  if (declarerRaw <= total / 2) {
    result[defender] = toGame(total, contract.mode);
    result[declarer] = 0;
    result.note = 'down';
  } else {
    result.A = toGame(a, contract.mode);
    result.B = toGame(b, contract.mode);
    result.note = 'ok';
  }
  return result;
}
