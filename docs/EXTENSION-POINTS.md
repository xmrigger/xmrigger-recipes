# Extension points

Stable surfaces (relatively) and unstable ones, as of mesh `0.1.x` /
proxy `0.1.x` / xmrigger `0.x`. Read this as a snapshot, not a contract.

## Mesh transport

### Stable enough to extend

- `new MeshNode({ port, seeds, name, minPeersForAlert })` constructor.
- `node.start()` / `node.stop()` — lifecycle.
- `node.broadcast(typeId, payload)` — fire to all connected peers.
- `node.on(typeId, handler)` — receive a channel.
- HELLO frame structure: `{ version, pubkey, nodeId }` exchanged at
  handshake. The `pubkey` is the ephemeral X25519 public key (hex).

### Reserved channel ids

| ID    | Channel              | Direction          |
|-------|----------------------|--------------------|
| 0x10  | `PREVHASH_ANNOUNCE`  | broadcast          |
| 0x11  | `GUARD_ALERT`        | broadcast          |
| 0x12–0xFF | reserved          | (do not use)       |
| 0x100+ | application range   | yours to define    |

If you want to add identity/auth, define a channel in your application
range — do **not** overload the reserved core channels.

### Unstable surfaces (will change)

- The exact shape of `peerInfo` returned to handlers.
- Reconnect/retry timing.
- The `nodeId` derivation (currently random).

## Proxy

### Stable enough to extend

- `new XmrProxy({ listenPort, listenHost, poolHost, poolPort, name,
  guard, mesh })` constructor and the events it emits:
  `guard-warn`, `guard-crit`, `guard-fork`, `guard-safe`, `evacuate`,
  `prevhash-divergence`, `prevhash-resolved`, `ready`.

### Customisation hooks

There are **no plugin hooks**. If you want different behaviour, the
intended path is to read `XmrProxy` as reference and write your own
class that imports the same `xmrigger` and `xmrigger-mesh` libraries.
The recipes show this directly: each example builds its own small
proxy-equivalent rather than wrapping `XmrProxy`.

## xmrigger detection

### Stable enough to extend

- `new HashrateMonitor({ poolStatsUrl, poolHealthUrl, threshold,
  pollIntervalMs, gracePeriodMs, fallbackPools })` and its events
  (`safe`, `warn`, `crit`, `fork`, `evacuate`).
- `new PrevhashMonitor({ poolId, getPrevhash, pollIntervalMs,
  divergenceMs, minPeersForAlert })` and its events
  (`announce`, `divergence`, `resolved`).
- `mon.onPeerAnnounce(peerId, prevhash[, ts])` — feed a peer's
  prevhash into the monitor.

### Unstable

- The internal mathematics of `divergenceMs` (currently a simple time
  window; could become weighted by peer count, age, recency).
- Exact JSON shape of `evacuate` events.

## What is **not** an extension point

- Internal state of the encryption: keys, nonces, derived secrets.
  Don't poke at them; the surface is unstable and the wrong knob
  breaks everything.
- The transport choice. Currently WebSocket; could move to QUIC or
  raw TCP later.
- The Stratum parser. It's a moving target.
