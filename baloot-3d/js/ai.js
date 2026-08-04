// Simple heuristic AI for Baloot bots.
import { cardStrength, cardPoints, teamOf } from './baloot.js';

// Bidding decision. flipped = the face-up card. hand = 5 dealt cards.
// Returns 'hokom' | 'sun' | 'pass'.
export function decideBid(hand, flipped, round) {
  const trump = flipped.suit;
  const trumpCards = hand.filter(c => c.suit === trump);
  const highTrumps = trumpCards.filter(c => c.rank === 'J' || c.rank === '9' || c.rank === 'A').length;
  const aces = hand.filter(c => c.rank === 'A').length;
  const tens = hand.filter(c => c.rank === '10').length;

  // Hokom appetite: strong in the flipped suit.
  if (round === 1) {
    if (trumpCards.length >= 3 && highTrumps >= 1) return 'hokom';
    if (aces >= 2 && tens >= 1) return 'sun';
    if (trumpCards.length >= 4) return 'hokom';
    return 'pass';
  }
  // Round 2: bid on best own suit if strong, else sun on high cards, else pass.
  if (aces >= 2) return 'sun';
  if (trumpCards.length >= 3) return 'hokom';
  return 'pass';
}

// In round 2, pick which suit to make trump if choosing hokom.
export function bestTrumpSuit(hand) {
  const counts = {};
  for (const c of hand) counts[c.suit] = (counts[c.suit] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Choose a card to play from the legal set.
export function chooseCard(legal, trick, contract, myPos) {
  if (legal.length === 1) return legal[0];
  const leadSuit = trick.length ? trick[0].card.suit : null;

  if (trick.length === 0) {
    // Leading: play a strong card, prefer non-trump aces early.
    const aces = legal.filter(c => c.rank === 'A' && !(contract.mode === 'hokom' && c.suit === contract.trump));
    if (aces.length) return aces[0];
    // otherwise lowest value card
    return lowest(legal, contract);
  }

  // Determine current winner.
  const winner = trick.reduce((best, t) =>
    cardStrength(t.card, leadSuit, contract) > cardStrength(best.card, leadSuit, contract) ? t : best, trick[0]);
  const partnerWinning = teamOf(winner.pos) === teamOf(myPos);

  if (partnerWinning) {
    // Feed points to partner if we can't/needn't beat; dump highest-point safe card.
    return highestPoints(legal, contract);
  }

  // Try to win: smallest card that beats the current winner.
  const winners = legal.filter(c => cardStrength(c, leadSuit, contract) > cardStrength(winner.card, leadSuit, contract));
  if (winners.length) return lowest(winners, contract);

  // Can't win: discard lowest-value card.
  return lowest(legal, contract);
}

function lowest(cards, contract) {
  return cards.reduce((m, c) => cardPoints(c, contract) < cardPoints(m, contract) ? c : m, cards[0]);
}
function highestPoints(cards, contract) {
  return cards.reduce((m, c) => cardPoints(c, contract) > cardPoints(m, contract) ? c : m, cards[0]);
}
