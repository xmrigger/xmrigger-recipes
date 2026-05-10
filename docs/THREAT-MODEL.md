# Threat model

What the mesh does and does not defend against, said clearly so the
reader can decide what they need to add.

## What the mesh transport (xmrigger-mesh) **does** defend

| Threat                                          | How |
|--------------------------------------------------|-----|
| Passive eavesdropping on the wire                | X25519 ECDH derives a fresh symmetric key per session; AES-256-GCM on every frame. |
| Active tampering with frames                     | AES-GCM auth tag. Every frame is verified; a single flipped bit drops the frame. |
| Replay across sessions                           | Each session has its own keys. Old frames don't decrypt under new keys. |
| Forward secrecy after key compromise             | Ephemeral X25519, no long-term key material in the handshake. Compromising today's keypair doesn't expose yesterday's traffic. |

## What the mesh transport **does not** defend

| Threat                                          | Why it's left to you |
|--------------------------------------------------|----------------------|
| **Sybil attacks** (one operator runs N peers)   | Any peer that completes the handshake is accepted. There is no cost to forge a new identity. You add the gate (allowlist, PoW, stake binding, …). |
| **Eclipse attacks** (an attacker fills your peer slots) | Peer selection is "first connections that complete the handshake". No diversity heuristic, no reputation. |
| **Replay within a session**                     | The transport has no monotonic counter exposed at the application layer. If your channel needs idempotency, add a sequence number to the payload. |
| **Identity theft after key reuse**              | If you reuse the same long-term key across sessions (recipes 02–04), and the key is exfiltrated, an attacker can impersonate you. Key storage hygiene is yours. |
| **Pool collusion**                              | The mesh assumes peers are independent observers of independent pools. If two "peers" are run by the same pool operator, they will agree by construction. The mesh has no way to detect this. |
| **Lying peers**                                 | A peer that sends a fabricated `prevhash` looks identical to one that mined a real block. Cross-checking is statistical (more peers = more confidence) but never absolute. |
| **Long-range view attacks**                     | The mesh has no view of historical state. A peer that joins now and lies about events 10 minutes ago is not detectable from inside. |
| **Application-layer DoS**                       | A peer can flood any channel; the transport will deliver every byte. Rate-limiting is your job. |

## Who is the trusted-by-design party?

**Yourself only.**

Specifically: the local proxy you run, the local monitors, the local
fallback list. Anything coming from a peer is **input data**, not
authority. The strongest signal is *coincidence* — multiple
independent peers agreeing on something — and even that is
probabilistic.

## What the recipes assume

Each recipe assumes you have a **mental model** of what kind of peer is
on the other end:

- `01-listen-only` — assumes nothing; you don't act on what peers say.
- `02-tofu-identity` — assumes the *first* peer with a given pubkey is
  legitimate; subsequent connections from impersonators are detected.
- `03-pki-whitelist` — assumes you know in advance who your peers are.
- `04-monero-bound-id` — assumes whoever controls the wallet is the
  legitimate operator; useful when the cost of a wallet (stake, mined
  XMR) is meaningful.
- `05-pow-anti-sybil` — assumes you don't know peers in advance but
  the cost of forging many is bounded by CPU time.

Each is right for some deployment. None is right for all.

## What this document does **not** cover

- Application semantics. What a `GUARD_ALERT` *means* is up to the
  receiving proxy.
- Operational security: key rotation, audit logging, incident
  response. Out of scope.
- Legal/compliance considerations of running mining infrastructure.
  Definitely out of scope.
