# 00 — mesh loopback

A **complete, self-contained, end-to-end working example**. No `TODO`,
no missing pieces, no external network. Two `MeshNode` instances are
started in the same process on different localhost ports, one connects
to the other, they handshake, one broadcasts, the other receives, and
the test asserts the round-trip.

This is the trivial recipe — the one that proves the transport library
works on your machine before you commit to any of the more interesting
recipes.

## What it shows

- Spawning a `MeshNode` (server side, no seeds).
- Spawning a second `MeshNode` (client side, with one seed).
- The X25519 + AES-GCM handshake completing automatically (no code
  from you to make it happen).
- A `broadcast` on a reserved channel arriving at the other peer with
  the same payload.

## What it does **not** show

- Identity, trust, allowlists — see recipes 02 through 05.
- Real peers across the internet — `ws://127.0.0.1` is the simplest
  loopback possible. Production deployments use `wss://` over a
  TLS-terminating proxy or with `tls: { cert, key }` in the
  `MeshNode` options.
- The `xmrigger-proxy` machinery on top — this recipe is the mesh
  transport in isolation.

## Run

```
npm install
node test.js
```

Expected output:

```
[server] started on port 18765
[client] started on port 18766, connecting to seed
[server] peer connected
[client] peer connected
[client] broadcasting PREVHASH_ANNOUNCE
[server] received PREVHASH_ANNOUNCE: prevhash=abc123def456... pool=test:3333
PASS — round-trip OK
```

The exit code is `0` on success, `1` on any assertion failure. That
makes it usable in CI: `node test.js && echo good`.

## Why a loopback test is enough

The transport doesn't behave differently across the loopback vs the
internet — the same handshake, the same crypto, the same frames. If
loopback fails, nothing else will work either. If loopback passes,
your problem with the real network is somewhere else (firewall, DNS,
TLS).

A real-network smoke test is intentionally not in this repo: it would
need someone else's seed, and we have no good way to ship one without
becoming responsible for keeping it up.
