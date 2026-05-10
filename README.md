# xmrigger-recipes

Skeleton examples for extending [xmrigger-mesh](https://github.com/xmrigger/xmrigger-mesh)
with the parts the project deliberately leaves out — peer authentication
above all.

This repository is **didactic**, not production. Each example is a small,
intentionally incomplete starting point: enough scaffolding to make the
extension surface visible, with explicit `// TODO: you provide this`
markers where the developer is expected to fill the rest.

If you are looking for a working desktop tool, see
[xmrigger-widget](https://github.com/xmrigger/xmrigger-widget). If you want
the libraries underneath, see
[xmrigger](https://github.com/xmrigger/xmrigger),
[xmrigger-mesh](https://github.com/xmrigger/xmrigger-mesh), and
[xmrigger-proxy](https://github.com/xmrigger/xmrigger-proxy).

## Why this exists

`xmrigger-mesh` ships with a transport layer that is encrypted (X25519
ECDH + AES-256-GCM, every frame authenticated as a frame) but the
identities behind the connections are **ephemeral**: a fresh keypair per
session, with no proof that the same human/node operates two consecutive
sessions, no allowlist, no signature against a long-term key.

This is a deliberate design choice. The mesh transport is a **building
block**, not a finished federation. Identity and trust are out of scope —
they belong to whoever composes the pieces, because the right shape of
identity depends on the threat model:

| Threat model | Identity shape |
|---|---|
| Friends federating their own proxies | manual allowlist of long-term ed25519 pubkeys |
| Public network with weak trust | TOFU + reputation accumulation |
| Bound to a real-world economic stake | identity derived from a Monero address signature |
| Anti-Sybil under open join | proof-of-work gate per session |
| Audited consortium | PKI with explicit CA |

There is no single right answer. The five examples below sketch the
**shapes** without committing to one.

## Layout

```
xmrigger-recipes/
├── README.md                          this file
├── INTEGRATION.md                     what we provide vs what you write
├── LICENSE                            LGPL-2.1
├── docs/
│   ├── ARCHITECTURE.md                how the three repos compose
│   ├── EXTENSION-POINTS.md            stable / unstable surfaces
│   └── THREAT-MODEL.md                what we don't defend against
├── examples/
│   ├── 01-listen-only/                receive mesh events, no identity
│   ├── 02-tofu-identity/              ed25519 long-term key, trust on first use
│   ├── 03-pki-whitelist/              explicit allowlist of pubkeys
│   ├── 04-monero-bound-id/            identity from a Monero address signature
│   └── 05-pow-anti-sybil/             proof-of-work gate per session
└── .gitignore
```

## Status

**Beta. No stable API.** The skeletons compile, none of them are complete
and none should be deployed as-is. They exist to make a conversation
possible between people who know identity systems and the questions the
mesh leaves open.

## License

[LGPL-2.1](./LICENSE), same as the upstream mesh and proxy.
