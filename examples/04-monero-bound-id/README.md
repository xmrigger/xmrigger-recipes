# 04 — Monero-bound identity

Bind the long-term mesh identity to a **Monero address**. A peer
proves they control the address by signing the HELLO with the
view/spend key (or, more practically, by signing a fresh nonce that
the verifier issues).

## What this answers

> *"The actors I care about are mining-pool operators. They already
> have a Monero address. Can I make the mesh identity be that
> address — so the cost of joining the mesh is the cost of getting
> a wallet?"*

This binds the cost of a mesh identity to the cost of a Monero
address. For the most part, that cost is near-zero (anyone can
generate a wallet). What it gives you instead is a *durable* binding:
the same identity across sessions is the same wallet.

A stronger variant binds to a wallet that has *received non-trivial
mining payouts* — i.e. an address with a track record. That's not
provided here; it's a layer you build on top.

## What you write

1. **Sign-with-Monero scheme.** Monero supports message signing via
   `monero-wallet-cli`'s `sign` / `verify` commands. You decide:
   - what the signed message contains (the mesh nodeId? a fresh
     verifier nonce?)
   - whether you require the wallet daemon to be reachable (cleaner)
     or accept an offline-signed proof (more practical)
   - the signature format you wire on the application channel
2. **Verifier.** Accept or reject the HELLO based on the signature.
3. **Stake threshold (optional).** If you want to gate by "wallet
   has been paid by a pool ≥ X XMR", you add a wallet-history check.
   Out of scope for this skeleton.

## Why "bound to a Monero address" is interesting

- **Self-evident scope.** The whole point of the federation is to
  guard the mining environment. Identity bound to a wallet means
  identity bound to "actor with stake in that environment".
- **No CA, no allowlist.** The verifier needs only the public address
  string and the signature; no out-of-band coordination.
- **Privacy preserved.** The wallet doesn't need to be the operator's
  payout wallet. It can be a throwaway address used only for mesh
  identity, as long as the operator commits to using the same one.

## Why it is **not** a panacea

- A peer can rotate to a fresh wallet at any time. You get
  pseudonymity, not single-identity-per-actor.
- An attacker with money can buy enough XMR to pay themselves and
  fake "stake".
- Monero signing is not free of footguns. View key vs spend key vs
  subaddress signing each have different security implications.
- This recipe is the **shape** — production deployments need to
  pick a specific signing scheme and stick to it.
