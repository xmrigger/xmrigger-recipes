'use strict';
/**
 * 03-pki-whitelist — explicit allowlist of long-term ed25519 pubkeys.
 *
 * The shape:
 *   1. Operator maintains a list of trusted long-term pubkeys.
 *   2. Each peer signs a HELLO with their long-term key.
 *   3. Verifier rejects every peer whose long-term key is not on the list.
 *
 * The skeleton stops at "what does the list look like and where does it
 * live?". You answer that.
 */

const crypto = require('crypto');
const { MeshNode, OPEN } = require('xmrigger-mesh');

const CHAN_IDENTITY_HELLO = 0x100;

// ── TODO: you provide this ─────────────────────────────────────────────────
// The allowlist. Suggestions:
//   - hardcoded array (simple, restart-required to change)
//   - JSON file watched with fs.watch (hot-reload)
//   - Git repository pulled on a timer (auditable, slower)
//   - external KV store (Redis, etcd) for shared mesh operators
// All of those have different semantics; pick one. The skeleton refuses
// to load by throwing, so you cannot run it as-is.
function loadAllowlist() {
  throw new Error('TODO: implement loadAllowlist() — return Set<hexLongTermPubkey>');
}

// ── TODO: you provide this ─────────────────────────────────────────────────
// Identity (same as recipe 02). Where does your long-term ed25519 keypair
// live, who reads it, how does it survive reinstall?
function loadOrCreateIdentity() {
  throw new Error('TODO: implement loadOrCreateIdentity()');
}

// ── Setup ──────────────────────────────────────────────────────────────────
const allowlist = loadAllowlist();    // Set<hex pubkey>
const me = loadOrCreateIdentity();    // { publicKey, privateKey } as KeyObjects

if (!allowlist.has(me.publicKey.toString('hex'))) {
  // sanity: refuse to start if our own key isn't on the list
  console.warn('warning: own long-term pubkey is not in the allowlist');
}

const node = new MeshNode({
  port: 8765,
  seeds: process.argv.slice(2),
  name: 'pki-node',
});

// On peer connect: send our signed HELLO.
node.on('peer-connected', ({ peerId }) => {
  const payload = {
    longTermPubkey: me.publicKey.toString('hex'),
    nodeId: peerId,
    timestamp: Date.now(),
  };

  // TODO: you provide this — sign the canonical bytes of `payload`.
  // The signature should cover *everything* in the payload, in a stable
  // serialisation (sort keys, pin types). Otherwise an attacker can
  // forge a payload that matches a previously-valid signature.
  const sig = null;
  if (!sig) throw new Error('TODO: implement HELLO signature');

  node.broadcast(CHAN_IDENTITY_HELLO, { ...payload, sig: sig.toString('hex') });
});

// Verified peer set, populated as identity HELLOs are accepted.
const verifiedPeers = new Map();   // peerId -> longTermPubkey

node.on(CHAN_IDENTITY_HELLO, ({ payload, peerId }) => {
  const longTerm = payload.longTermPubkey;

  // 1. allowlist check (cheap, do first)
  if (!longTerm || !allowlist.has(longTerm)) {
    // TODO: you provide this — actively close the peer's session.
    // The current MeshNode API doesn't expose a per-peer disconnect
    // method publicly; you'll either patch it in a fork or maintain
    // a per-peer "ignore" set checked on every channel handler below.
    console.warn(`reject: peer ${peerId.slice(0, 8)} long-term pubkey not in allowlist`);
    return;
  }

  // 2. signature check
  // TODO: you provide this — verify payload.sig over the canonical
  // serialisation of payload (without `sig`). Use crypto.verify('ed25519', …).
  const sigOk = false;
  if (!sigOk) {
    console.warn(`reject: peer ${peerId.slice(0, 8)} signature invalid`);
    return;
  }

  // 3. timestamp skew (anti-replay-of-old-handshake)
  if (Math.abs(Date.now() - payload.timestamp) > 60_000) {
    console.warn(`reject: peer ${peerId.slice(0, 8)} timestamp skew too large`);
    return;
  }

  verifiedPeers.set(peerId, longTerm);
  console.log(`accept: peer ${peerId.slice(0, 8)} long-term=${longTerm.slice(0, 16)}…`);
});

// Only act on signals from verified peers.
node.on(OPEN.PREVHASH_ANNOUNCE, ({ payload, peerId }) => {
  if (!verifiedPeers.has(peerId)) return;   // silent drop, not even log
  // TODO: you provide this — feed payload.prevhash into your local
  // PrevhashMonitor (xmrigger package) via mon.onPeerAnnounce(peerId, prevhash).
});

node.on(OPEN.GUARD_ALERT, ({ payload, peerId }) => {
  if (!verifiedPeers.has(peerId)) return;
  // TODO: feed into a quorum-based alert handler (see xmrigger-proxy
  // for a reference: src/alert-quorum.js).
});

node.start().catch(err => {
  console.error('mesh failed to start:', err);
  process.exit(1);
});
