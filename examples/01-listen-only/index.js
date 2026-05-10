'use strict';
/**
 * 01-listen-only — connect to a xmrigger-mesh federation and log what arrives.
 *
 * Usage:
 *   node index.js wss://seed1.example:8765 [wss://seed2... ...]
 *
 * No identity is asserted. No actions are taken. Frames decrypt because
 * the transport gives confidentiality + integrity for free; that is the
 * only guarantee in play here.
 */

const { MeshNode, OPEN } = require('xmrigger-mesh');

const seeds = process.argv.slice(2);
if (seeds.length === 0) {
  console.error('usage: node index.js wss://seed:8765 [wss://...]');
  process.exit(1);
}

// Random listen port — we don't expose ourselves as a seed in this recipe.
const listenPort = 0;

const node = new MeshNode({
  port: listenPort,
  seeds,
  name: 'listen-only',
});

node.on(OPEN.PREVHASH_ANNOUNCE, ({ payload, peerId }) => {
  // payload.prevhash is a hex string from the upstream pool's stratum job.
  // payload.pool is the host:port the peer is currently watching.
  console.log(`[${ts()}] PREVHASH_ANNOUNCE peer=${peerId.slice(0, 8)} pool=${payload.pool} prevhash=${payload.prevhash?.slice(0, 16)}…`);
});

node.on(OPEN.GUARD_ALERT, ({ payload, peerId }) => {
  // payload.reason is one of: 'hashrate-threshold', 'fork', 'selfish-mining'.
  // Note: with no identity, you cannot tell whether peerId is who they
  // claim to be, or whether multiple peerIds are in fact one operator.
  console.log(`[${ts()}] GUARD_ALERT      peer=${peerId.slice(0, 8)} reason=${payload.reason} pool=${payload.pool}`);
});

node.start().then(() => {
  console.log(`[${ts()}] mesh started — listening, ${seeds.length} seed(s)`);
}).catch(err => {
  console.error('mesh failed to start:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log(`\n[${ts()}] stopping…`);
  await node.stop().catch(() => {});
  process.exit(0);
});

function ts() { return new Date().toISOString(); }
