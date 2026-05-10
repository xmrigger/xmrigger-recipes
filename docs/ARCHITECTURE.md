# Architecture

How the three small repos compose into a federated guard system.

```
                       ┌──────────────────────────┐
                       │  xmrigger                │
                       │                          │
                       │  HashrateMonitor   ◄──── poll pool /stats
                       │  PrevhashMonitor   ◄──── compare across peers
                       │                          │
                       │  emits: warn, crit,      │
                       │   fork, evacuate,        │
                       │   divergence, resolved   │
                       └──────────┬───────────────┘
                                  │
                                  │ used by
                                  ▼
   ┌────────────────────────────────────────────────────────────┐
   │  xmrigger-proxy / XmrProxy                                 │
   │                                                            │
   │  ┌────────────────┐                  ┌───────────────────┐ │
   │  │  StratumProxy  │ ── transparent ──► local :3333       │ │
   │  │                │   pass-through    XMRig connects here│ │
   │  └────────┬───────┘                  └───────────────────┘ │
   │           │                                                │
   │           │ extracts prevhash, observes shares             │
   │           ▼                                                │
   │  ┌────────────────┐         ┌──────────────────────┐       │
   │  │  Monitors      │───────► │  MeshNode (optional) │ ◄─── peers
   │  │  (above)       │ events  │  X25519 + AES-GCM    │       │
   │  └────────────────┘         └──────────────────────┘       │
   │           │                                                │
   │           ▼                                                │
   │       _onEvacuate(reason, fallback?)                       │
   │       — switches upstream pool if a fallback is configured │
   └────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                          upstream Monero pool
```

## What flows where

- **XMRig → StratumProxy → upstream pool.**  
  Bytes pass through unchanged. The proxy reads the stratum frames in
  passing and extracts what it needs (`prevhash`, share counts, pool
  identity) without rewriting them.

- **HashrateMonitor → polls a stats URL → emits events.**  
  Independent of the mining stream. Pure HTTP polling against a
  third-party endpoint (configurable per pool).

- **PrevhashMonitor → compares own prevhash to peer announcements.**  
  Produces `divergence` events when the chain visible to the local
  proxy diverges from what other peers see for more than a configurable
  window (default 20s).

- **MeshNode (optional) → broadcasts and receives.**  
  When `--mesh-port` or `--seed` is set, the proxy joins a federation.
  Each peer-to-peer link is a fresh ECDH session; identity is whatever
  the application layer puts on top.

## Identity boundary

Everything above the dotted line is provided. Everything below is yours:

```
─────────────── provided by xmrigger* ───────────────
   transport       confidentiality + integrity
   detection       hashrate %, prevhash divergence
   evacuation      pool switch hook
─────────────── boundary ───────────────────────────
   identity        who is this peer?
   trust           do I act on their alerts?
   reputation      have they been right before?
   sybil gate      can the same actor fake N peers?
─────────────── you write this ─────────────────────
```

The recipes in `examples/` propose five different shapes for the part
below the boundary. None is part of the upstream codebase.
