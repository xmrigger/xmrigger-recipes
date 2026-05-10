'use strict';
/**
 * 00-mesh-loopback — end-to-end mesh smoke test in one process.
 *
 * Two MeshNode instances on localhost:
 *   server (port 18765) — no seeds, just listens
 *   client (port 18766) — connects to server as a seed
 *
 * Once handshake completes the client broadcasts a PREVHASH_ANNOUNCE,
 * the server registers the receive, the test asserts the payload
 * matches and exits 0. On any failure (timeout, mismatch, decode
 * error) the test exits 1.
 *
 * No network beyond loopback. No identity. No external dependencies
 * beyond xmrigger-mesh itself.
 */

const { MeshNode, OPEN } = require('xmrigger-mesh');
const assert = require('node:assert/strict');

const SERVER_PORT  = 18765;
const CLIENT_PORT  = 18766;
const TIMEOUT_MS   = 5_000;

const SENT = {
  prevhash: 'abc123def456abc123def456abc123def456abc123def456abc123def4567890',
  pool: 'test:3333',
};

async function main() {
  // ── Set up the server (the "seed" the client will connect to) ────────────
  const server = new MeshNode({ port: SERVER_PORT, name: 'server' });

  // Listener has to be registered *before* messages arrive, otherwise
  // we miss the very first frame in the race against the client's send.
  const received = new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error('timeout: server never received PREVHASH_ANNOUNCE')),
      TIMEOUT_MS,
    );
    server.on(OPEN.PREVHASH_ANNOUNCE, ({ payload, peerId }) => {
      clearTimeout(t);
      console.log(`[server] received PREVHASH_ANNOUNCE: prevhash=${payload.prevhash?.slice(0, 16)}… pool=${payload.pool} from peer=${peerId.slice(0, 8)}`);
      resolve(payload);
    });
  });

  server.on('peer-connected', () => console.log('[server] peer connected'));
  await server.start();
  console.log(`[server] started on port ${SERVER_PORT}`);

  // ── Set up the client (with the server as its only seed) ─────────────────
  const client = new MeshNode({
    port:  CLIENT_PORT,
    seeds: [`ws://127.0.0.1:${SERVER_PORT}`],
    name:  'client',
  });

  const peerConnected = new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error('timeout: client never saw peer-connected')),
      TIMEOUT_MS,
    );
    client.on('peer-connected', () => {
      clearTimeout(t);
      console.log('[client] peer connected');
      resolve();
    });
  });

  await client.start();
  console.log(`[client] started on port ${CLIENT_PORT}, connecting to seed`);
  await peerConnected;

  // ── Broadcast and wait for the round-trip ────────────────────────────────
  console.log('[client] broadcasting PREVHASH_ANNOUNCE');
  client.broadcast(OPEN.PREVHASH_ANNOUNCE, SENT);

  const got = await received;

  // ── Assertions ───────────────────────────────────────────────────────────
  assert.equal(got.prevhash, SENT.prevhash, 'prevhash mismatch');
  assert.equal(got.pool,     SENT.pool,     'pool mismatch');

  console.log('PASS — round-trip OK');

  // Clean shutdown so the test process exits without dangling sockets.
  client.stop();
  server.stop();
}

main().catch(err => {
  console.error('FAIL —', err.message);
  process.exit(1);
});
