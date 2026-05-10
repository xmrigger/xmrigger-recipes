# Integration

The xmrigger suite is split into three small packages. Each does one thing
and stops. The recipes in this repository show how to compose them with
your own code; this document is the reference for *what is provided* vs
*what you write*.

## What we provide

### `xmrigger`

- `HashrateMonitor` — polls a pool's stats endpoint, emits `safe`,
  `warn`, `crit`, `fork`, `evacuate`, `safe` events with a configurable
  threshold (default 0.43 of network hashrate).
- `PrevhashMonitor` — compares the upstream pool's `prevhash` field to
  prevhashes announced by federation peers. Emits `divergence` (selfish
  mining suspected) and `resolved` (chains in sync).
- No identity, no transport. Pure detection logic.

### `xmrigger-mesh`

- `MeshNode` — a WebSocket-based encrypted P2P transport.
  - X25519 ECDH key agreement, fresh per session (forward secrecy).
  - AES-256-GCM AEAD on every frame.
  - HELLO handshake exchanging `pubkey` (ephemeral) and `nodeId` (random).
  - Pluggable channel types, `0x00–0xFF` reserved (PREVHASH_ANNOUNCE,
    GUARD_ALERT, …).
- No identity verification. The peer at the other end is whoever holds
  the matching session key — nothing more.

### `xmrigger-proxy`

- `XmrProxy` — wires a transparent Stratum proxy together with both
  monitors and the mesh node. Auto-evacuates to a fallback pool on
  threshold breach.
- `--no-mesh` flag disables the federation layer entirely (the mode the
  desktop widget uses).

## What you write

The recipes assume you write the parts the upstream pieces leave open.
Every example below has an `index.js` that loads `MeshNode` and a
prominent `// TODO: you provide this` block where the missing piece goes.

### Identity (recipes 02–05)

You decide:

1. What is the **long-term identity** of a peer? An ed25519 keypair
   stored on disk? A monero address signature? A hardware token?
2. **When** is identity verified? At HELLO time, or per-payload?
3. **What** does the identity authorize? Joining the mesh? Sending
   specific channel types? Voting in a quorum?

The mesh transport gives you a confidential, integrity-protected pipe.
Identity is your job.

### Trust establishment

You decide what makes a peer "trusted":

- explicit allowlist (`03-pki-whitelist`)
- first-seen-wins, persisted (`02-tofu-identity`)
- bound to an economic stake (`04-monero-bound-id`)
- bounded by computational cost to forge (`05-pow-anti-sybil`)

Each of these is correct for *some* deployment. None is correct for
all.

### Reaction to events

The monitors emit events. What you do with them is your call:

- log only?
- alert via webhook?
- evacuate automatically? to which fallback?
- broadcast to peers? with what reputation weight?
- lock down the mesh on suspicious activity?

## What we explicitly do **not** provide

- A canonical identity scheme. There isn't one — see THREAT-MODEL.md.
- Sybil resistance. The mesh accepts any peer that completes the X25519
  handshake. You add the gate.
- Replay protection across sessions. Each session has its own keys; old
  frames don't decrypt. But payload-level idempotency is your concern.
- Persistent peer state. The mesh is stateless across runs. If you need
  reputation or banlists, you write them.
- Production deployment guidance. These recipes are not "ops kits".

## API stability

**Beta. Zero stability guarantee.** Function names, event payloads, and
channel IDs may change without notice between minor versions of the
upstream repos. If you depend on the recipes, pin a commit hash, not a
branch name.
