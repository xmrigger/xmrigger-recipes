'use strict';
/**
 * 05-pow-anti-sybil — challenge-response proof of work, per session.
 *
 * Shape:
 *   1. Verifier issues a random challenge to a connecting peer.
 *   2. Peer searches for a `nonce` such that
 *        sha256(challenge || peerId || nonce)
 *      has at least `difficultyBits` leading zero bits.
 *   3. Peer sends nonce. Verifier checks. Accept on success.
 *
 * The skeleton works (the math, the search, the verify), but the
 * *policy* (difficulty, lifetime, reuse) is left to you.
 */

const crypto = require('crypto');
const { MeshNode, OPEN } = require('xmrigger-mesh');

const CHAN_POW_CHALLENGE = 0x100;
const CHAN_POW_SOLUTION  = 0x101;

// ── TODO: you provide this ─────────────────────────────────────────────────
// Difficulty in leading zero bits of the hash output. 20 is roughly 1
// second on a recent CPU. Tune to your environment.
const DIFFICULTY_BITS = 20;
// Time the verifier remembers an outstanding challenge.
const CHALLENGE_TTL_MS = 60_000;

const node = new MeshNode({
  port: 8765,
  seeds: process.argv.slice(2),
  name: 'pow-node',
});

const outstandingChallenges = new Map();   // peerId -> { challenge, expiresAt }
const verifiedPeers = new Set();           // peerId

// On peer connect, issue a challenge.
node.on('peer-connected', ({ peerId }) => {
  const challenge = crypto.randomBytes(32);
  outstandingChallenges.set(peerId, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  node.broadcast(CHAN_POW_CHALLENGE, {
    forPeer: peerId,
    challenge: challenge.toString('hex'),
    difficultyBits: DIFFICULTY_BITS,
  });
});

// On challenge directed at us, solve it (synchronous; a real impl should
// run this off the event loop).
node.on(CHAN_POW_CHALLENGE, ({ payload }) => {
  if (payload.forPeer !== ourPeerId()) return;

  const challenge = Buffer.from(payload.challenge, 'hex');
  const myId = Buffer.from(ourPeerId(), 'hex');
  const nonce = solvePow(challenge, myId, payload.difficultyBits);

  node.broadcast(CHAN_POW_SOLUTION, {
    forPeer: payload.forPeer,
    nonce: nonce.toString('hex'),
  });
});

// On solution arriving at us, verify and admit.
node.on(CHAN_POW_SOLUTION, ({ payload, peerId }) => {
  const issued = outstandingChallenges.get(peerId);
  if (!issued) return;
  if (issued.expiresAt < Date.now()) {
    outstandingChallenges.delete(peerId);
    return;
  }

  const peerIdBuf = Buffer.from(peerId, 'hex');
  const nonce = Buffer.from(payload.nonce, 'hex');
  if (verifyPow(issued.challenge, peerIdBuf, nonce, DIFFICULTY_BITS)) {
    verifiedPeers.add(peerId);
    outstandingChallenges.delete(peerId);
    console.log(`accept: peer ${peerId.slice(0, 8)} solved ${DIFFICULTY_BITS}-bit PoW`);
  } else {
    console.warn(`reject: peer ${peerId.slice(0, 8)} bad PoW solution`);
  }
});

// Only act on signals from verified peers.
node.on(OPEN.PREVHASH_ANNOUNCE, ({ peerId }) => {
  if (!verifiedPeers.has(peerId)) return;
  // TODO: feed into PrevhashMonitor.
});
node.on(OPEN.GUARD_ALERT, ({ peerId }) => {
  if (!verifiedPeers.has(peerId)) return;
  // TODO: feed into quorum handler.
});

// ── PoW math ───────────────────────────────────────────────────────────────

function solvePow(challenge, peerId, difficultyBits) {
  const nonce = Buffer.alloc(8);
  let counter = 0n;
  while (true) {
    nonce.writeBigUInt64BE(counter);
    const h = crypto.createHash('sha256')
      .update(challenge).update(peerId).update(nonce)
      .digest();
    if (leadingZeroBits(h) >= difficultyBits) return nonce;
    counter++;
  }
}

function verifyPow(challenge, peerId, nonce, difficultyBits) {
  const h = crypto.createHash('sha256')
    .update(challenge).update(peerId).update(nonce)
    .digest();
  return leadingZeroBits(h) >= difficultyBits;
}

function leadingZeroBits(buf) {
  let bits = 0;
  for (const b of buf) {
    if (b === 0) { bits += 8; continue; }
    let m = 0x80;
    while (m && (b & m) === 0) { bits++; m >>= 1; }
    return bits;
  }
  return bits;
}

// ── Stub same as recipe 04 ─────────────────────────────────────────────────
function ourPeerId() {
  throw new Error('TODO: capture our nodeId during start() and return it here');
}

node.start().catch(err => {
  console.error('mesh failed to start:', err);
  process.exit(1);
});
