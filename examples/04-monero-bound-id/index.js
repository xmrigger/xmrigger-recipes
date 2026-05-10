'use strict';
/**
 * 04-monero-bound-id — bind mesh identity to a Monero address signature.
 *
 * Shape:
 *   1. Each peer has a Monero address used as its long-term identity.
 *   2. Each peer signs a fresh nonce (issued by the verifier) with the
 *      address. The signature comes back over an application channel.
 *   3. Verifier checks the Monero signature and accepts/rejects.
 *
 * The Monero signing path itself (which RPC, which library, which
 * subaddress, what to do when the daemon is offline) is the part that
 * cannot be ergonomic in 100 lines, so it stays as a TODO.
 */

const { MeshNode, OPEN } = require('xmrigger-mesh');

const CHAN_NONCE_REQUEST  = 0x100;
const CHAN_NONCE_RESPONSE = 0x101;

const node = new MeshNode({
  port: 8765,
  seeds: process.argv.slice(2),
  name: 'monero-bound',
});

// ── TODO: you provide this ─────────────────────────────────────────────────
// Your own Monero address (not your payout address — a throwaway is fine
// as long as you keep using it).
const myMoneroAddress = process.env.MESH_MONERO_ADDRESS;
if (!myMoneroAddress) {
  throw new Error('TODO: set MESH_MONERO_ADDRESS to your mesh-identity address');
}

// ── TODO: you provide this ─────────────────────────────────────────────────
// Sign a message with your Monero address. Options:
//   - shell out to `monero-wallet-cli --sign-msg`
//   - call `monero-wallet-rpc /sign` over JSON-RPC
//   - use a third-party Monero JS lib (be careful — most don't sign)
//   - sign offline once, accept the signature lifetime tradeoff
async function signWithMoneroAddress(message) {
  throw new Error('TODO: implement Monero message signing');
}

// ── TODO: you provide this ─────────────────────────────────────────────────
// Verify a Monero-address signature. Mirror of the signer; same caveats.
async function verifyMoneroSignature(address, message, sig) {
  throw new Error('TODO: implement Monero signature verification');
}

// ── Issued nonces, kept short-lived to bound replay attacks ─────────────────
const nonces = new Map();   // peerId -> { nonce, expiresAt }
const NONCE_TTL_MS = 30_000;

const verifiedPeers = new Map();   // peerId -> moneroAddress

// On peer connect, ask them to prove address ownership.
node.on('peer-connected', ({ peerId }) => {
  const nonce = require('crypto').randomBytes(32).toString('hex');
  nonces.set(peerId, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  node.broadcast(CHAN_NONCE_REQUEST, { for: peerId, nonce });
});

// On nonce request directed at us, sign and reply.
node.on(CHAN_NONCE_REQUEST, async ({ payload, peerId }) => {
  if (payload.for !== ourPeerId()) return;   // not for us

  const message = `xmrigger-mesh:${payload.nonce}`;
  const sig = await signWithMoneroAddress(message);
  node.broadcast(CHAN_NONCE_RESPONSE, {
    forPeer: peerId,
    address: myMoneroAddress,
    nonce: payload.nonce,
    sig,
  });
});

// On signed response, verify and admit (or drop).
node.on(CHAN_NONCE_RESPONSE, async ({ payload, peerId }) => {
  const issued = nonces.get(peerId);
  if (!issued || issued.nonce !== payload.nonce) return;
  if (issued.expiresAt < Date.now()) {
    nonces.delete(peerId);
    return;
  }

  const message = `xmrigger-mesh:${payload.nonce}`;
  const ok = await verifyMoneroSignature(payload.address, message, payload.sig);
  if (!ok) {
    console.warn(`reject: peer ${peerId.slice(0, 8)} Monero signature invalid`);
    return;
  }

  verifiedPeers.set(peerId, payload.address);
  nonces.delete(peerId);
  console.log(`accept: peer ${peerId.slice(0, 8)} = ${payload.address.slice(0, 12)}…`);
});

// Optional: only act on prevhash announcements from verified peers.
node.on(OPEN.PREVHASH_ANNOUNCE, ({ payload, peerId }) => {
  if (!verifiedPeers.has(peerId)) return;
  // TODO: feed into your PrevhashMonitor.
});

node.on(OPEN.GUARD_ALERT, ({ payload, peerId }) => {
  if (!verifiedPeers.has(peerId)) return;
  // TODO: react.
});

// ── Helper stub ────────────────────────────────────────────────────────────
function ourPeerId() {
  // The mesh node doesn't currently expose this directly. You'll need to
  // patch it, or maintain it yourself by capturing it during `MeshNode.start`.
  throw new Error('TODO: capture our nodeId during start() and return it here');
}

node.start().catch(err => {
  console.error('mesh failed to start:', err);
  process.exit(1);
});
