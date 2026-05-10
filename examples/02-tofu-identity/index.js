'use strict';
/**
 * 02-tofu-identity — long-term ed25519 keypair, trust on first use.
 *
 * What this skeleton shows:
 *   - The shape of the missing identity layer above the mesh transport.
 *   - Where a HELLO payload would carry a signature.
 *   - Where the local "known peers" store is consulted.
 *
 * What this skeleton does NOT do:
 *   - persist anything
 *   - sign anything
 *   - reject anything
 *
 * Filling these in is the point of the recipe.
 */

const crypto = require('crypto');
const { MeshNode, OPEN } = require('xmrigger-mesh');

// ── Application channel id for our identity layer ──────────────────────────
// Stay above 0xFF; anything <= 0xFF is reserved by the transport itself.
const CHAN_IDENTITY_HELLO = 0x100;

// ── TODO: you provide this ─────────────────────────────────────────────────
// Generate or load a long-term ed25519 keypair. Persist it under a path you
// control. The simplest implementation is something like:
//
//     const seed = fs.readFileSync('~/.xmrigger/identity.seed');     // 32 bytes
//     const { privateKey, publicKey } = crypto.generateKeyPairSync(
//       'ed25519',
//       { privateKeyEncoding: { type: 'pkcs8', format: 'der' } }
//     );
//
// but the real decision is *where* the key lives, who can read it, and how
// it survives reinstalls. The skeleton just stubs it.
function loadOrCreateIdentity() {
  // throw to make the missing piece loud
  throw new Error('TODO: implement loadOrCreateIdentity()');
}

// ── TODO: you provide this ─────────────────────────────────────────────────
// A persistent map { theirEd25519Pubkey -> firstSeenAt, peerName }.
// On first connection from a long-term pubkey, store it. On subsequent
// connections, the pubkey must match.
const knownPeers = {
  load:  () => { throw new Error('TODO: implement knownPeers.load()'); },
  has:   (pubkey) => { throw new Error('TODO: implement knownPeers.has()'); },
  trust: (pubkey, meta) => { throw new Error('TODO: implement knownPeers.trust()'); },
};

// ── Setup ──────────────────────────────────────────────────────────────────
const me = loadOrCreateIdentity();
knownPeers.load();

const node = new MeshNode({
  port: 8765,
  seeds: process.argv.slice(2),
  name: 'tofu-node',
});

// On every fresh connection, send our identity HELLO. The mesh transport's
// own HELLO is ephemeral; this one carries the long-term identity.
node.on('peer-connected', async ({ peerId, send }) => {
  const helloPayload = {
    longTermPubkey: me.publicKey.toString('hex'),
    nodeId: peerId,                 // the ephemeral nodeId, to bind the sig
    timestamp: Date.now(),
  };

  // TODO: you provide this — sign helloPayload with me.privateKey
  // const sig = crypto.sign(null, Buffer.from(JSON.stringify(helloPayload)), me.privateKey);
  const sig = null;
  if (!sig) throw new Error('TODO: implement signing of identity HELLO');

  // The send() function would broadcast on a specific channel to this peer.
  // The current MeshNode API broadcasts to all; rewrite this hook in your
  // implementation if you need point-to-point.
  node.broadcast(CHAN_IDENTITY_HELLO, { ...helloPayload, sig: sig.toString('hex') });
});

node.on(CHAN_IDENTITY_HELLO, ({ payload, peerId }) => {
  // TODO: you provide this — verify payload.sig against payload.longTermPubkey.
  // Reject (drop the connection) on:
  //   - bad signature
  //   - missing longTermPubkey
  //   - timestamp skew larger than your tolerance
  //   - longTermPubkey known but does not match the one we have for peerId
  const longTerm = payload.longTermPubkey;
  if (!longTerm) {
    console.warn('peer sent identity HELLO without long-term key, dropping');
    return; // TODO: also disconnect the underlying socket
  }
  if (knownPeers.has(longTerm)) {
    // TODO: confirm signature is valid; if not → impersonation, drop.
    return;
  }
  // TOFU: we haven't seen this long-term key before. Trust it for now.
  knownPeers.trust(longTerm, { firstSeen: Date.now(), nodeId: peerId });
});

// ── Use the (eventually) trusted mesh ──────────────────────────────────────
node.on(OPEN.PREVHASH_ANNOUNCE, ({ payload, peerId }) => {
  // TODO: you provide this — only act on payloads from peers whose
  // identity HELLO has been verified. A simple guard: maintain a set of
  // verifiedPeerIds, populate it from the identity HELLO handler above.
  console.log(`prevhash from ${peerId.slice(0, 8)}: ${payload.prevhash?.slice(0, 16)}… (verified? TODO)`);
});

node.start().catch(err => {
  console.error('mesh failed to start:', err);
  process.exit(1);
});
