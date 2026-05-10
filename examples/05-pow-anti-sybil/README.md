# 05 — Proof-of-work anti-Sybil

Require every joining peer to **spend CPU time** proving a hash
challenge before their identity is accepted. The goal: bound the
cost of running N peers, so a single attacker can't trivially fake
a quorum.

## What this answers

> *"I want a public mesh — anyone can join — but I don't want one
> attacker to spin up 200 peers and dominate the gossip."*

PoW gates were popularized by Hashcash and used as anti-spam in
e.g. early SMTP discussions. Here the application is the same: make
the cheap thing (joining) less cheap, by exactly enough to deter
bulk Sybil but not enough to keep legitimate peers out.

## What you write

1. **Difficulty function** — how many leading zero bits must the
   hash have? Static? Adjusted by mesh load? Adjusted per peer
   based on prior reputation? The skeleton uses a constant, you
   may want a curve.
2. **Hash function choice** — SHA-256 is fine. RandomX would
   actually make sense here too (it's the Monero PoW, and any
   miner already has hardware tuned for it). Out of scope for the
   skeleton.
3. **Challenge issuance** — how do you give a peer a fresh,
   unguessable challenge? Random bytes from the verifier, with a
   short expiry. The skeleton sketches this.
4. **Replay window** — once a peer has solved a challenge,
   should the solution be reusable for some time? (Probably not.)

## Difficulty trade-off

| Difficulty bits | Time on a recent CPU | Effect |
|---|---|---|
| 16 | ~50ms | trivial, only deters bots |
| 20 | ~1s | annoying but feasible |
| 24 | ~16s | hurts legitimate peers on slow hardware |
| 28+ | minutes | only useful for very-high-cost gates |

The "right" answer depends on what you're protecting against.
A small federation gating membership wants 24+ (joining is rare).
A high-churn public mesh wants 16-20 (joining must be cheap).

## What this **doesn't** prevent

- A *patient* attacker with one CPU and time. PoW gates Sybil at
  the volume axis, not the determination axis.
- A *rich* attacker with many CPUs. Ten parallel CPUs make the
  same gate ten times cheaper.
- Application-layer abuse *after* the join. PoW only gates entry.

## Combine with others

PoW is most effective combined with reputation: bots that solve a
challenge and then immediately misbehave can be ejected, and the
PoW cost is wasted. The skeleton doesn't track reputation; that's
the next layer up.
