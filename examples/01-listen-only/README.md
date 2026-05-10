# 01 — listen-only

A minimal recipe: connect to seed peers, decrypt the channel, log what
arrives. **No identity, no verification, no action.**

## What this answers

> *"What does the mesh actually carry? What do messages look like?"*

This is the recipe for a curious operator who wants to lurk on a small
test mesh before deciding whether to put any of the heavier examples
into use. It is also the only recipe that does not require you to write
any code yourself — it works as-is.

## What you do **not** get from this recipe

- No defence against Sybil. Anyone you connect to is "trusted" only in
  the sense that you decrypt their frames; you don't act on them.
- No reaction to alerts. `GUARD_ALERT`s are logged, never acted on.
- No outbound announcements. You never broadcast `PREVHASH_ANNOUNCE` or
  anything else.

If your goal is *"see the data, decide later"*, this is the right recipe.
If your goal is *"defend my proxy with peer signals"*, start at
[02-tofu-identity](../02-tofu-identity/) instead.

## Run

```
npm install
node index.js wss://your-seed-peer.example:8765
```

You can pass multiple seed URLs.

## What you'll see

- HELLO handshake completes silently.
- Each `PREVHASH_ANNOUNCE` (channel 0x10) prints a line.
- Each `GUARD_ALERT` (channel 0x11) prints a line.
- That's it.

## Caveats

- The seed must be reachable from your network. If it isn't, the script
  will retry with backoff and you'll see periodic reconnect attempts.
- Frames from peers you didn't expect look identical to frames from
  peers you did. With no identity, every announcement is *possibly*
  legitimate and *possibly* fabricated. This is the point of the
  recipe: showing the limit.
