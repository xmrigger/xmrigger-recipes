# 02 — TOFU identity

Bind each peer to a long-term **ed25519** key, accept the first one
seen for a given identity, refuse impersonators on later sessions.
Trust on First Use.

## What this answers

> *"How do I tell that the peer I talked to yesterday is the same as
> the one talking to me today, without setting up a CA or a manual
> allowlist?"*

This is the simplest persistent-identity story. It's the model SSH
uses for known_hosts. It is **not** secure against an attacker who
wins the *first* race — the legendary TOFU MITM window — but it
detects every later impersonation.

## What you write

The skeleton has these `TODO` blocks. They are deliberately not filled
in:

1. **Generate / load a long-term ed25519 keypair** — where do you store
   it? `~/.xmrigger/identity.key`? Hardware token? An existing keystore?
2. **Sign the HELLO** payload with your long-term key — the upstream
   `MeshNode` does **not** know about long-term keys; you carry the
   signature in your *own* application channel (e.g. `0x100`).
3. **On HELLO from a peer**, look up their long-term pubkey in your
   local store. If new, persist it (TOFU). If known, verify the
   signature; on mismatch, drop the connection.
4. Decide whether to **gossip** known long-term keys among peers. (We
   don't, because it opens a worm-style attack surface.)

## What's deliberately out

- We don't deal with **key rotation**. If you lose your ed25519 key,
  every peer that has TOFU'd you treats your replacement as an
  impersonator.
- We don't define a **ban path**. If you decide a peer is malicious,
  the file format for "blocked" is yours to design.
- We don't define how to **revoke** a stolen key. With pure TOFU,
  you can't.

## When to use this

- Small, private federations among people who already informally trust
  each other.
- A first iteration before moving to recipe 03 (explicit allowlist).
- As an upgrade path from `01-listen-only` once you decide whose
  signal you want to listen to.

## When **not** to use this

- Large-scale public mesh with adversarial peers. The first-seen rule
  becomes a race that motivated attackers will win.
- Any context where revocation matters more than detection.
