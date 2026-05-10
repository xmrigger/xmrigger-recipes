# 03 — PKI whitelist

Hardcoded **allowlist** of long-term ed25519 pubkeys. Anything not on
the list never gets to the application layer.

## What this answers

> *"I know exactly who my peers are. I want to refuse everything else
> at the door."*

Use this when the federation is small, mutually known, and slowly
changing — for example: three friends running proxies on their own
hardware, or an internal-only test mesh.

## What you write

The skeleton has these `TODO` blocks:

1. **The allowlist itself.** A static array? A YAML file the operator
   edits by hand? A Git repository the operator pulls from? Up to you.
2. **Long-term key + signature** scheme — same as recipe 02, but
   without the TOFU branch. Either the pubkey is on the list, or the
   peer is dropped.
3. **Hot-reload of the allowlist** if you want operators to add/remove
   keys without restarting the mesh node. (Optional.)

## Trade-offs vs recipe 02

| Aspect | TOFU (02) | Whitelist (03) |
|---|---|---|
| First-time impersonation | possible (race window) | not possible |
| Setup cost | low — auto-trust | medium — must distribute pubkeys |
| Adding a new peer | easy | manual edit |
| Removing a peer | hard (no revocation) | easy (remove from list) |
| Scale | up to dozens | up to dozens, then painful |
| Audit | implicit | explicit (the list IS the audit) |

## When this is the right shape

- Small federations of mutually known operators.
- Pre-production setups where you want a hard wall before opening up.
- Any environment where you'd put the list in version control and
  call it documentation.

## When this is the wrong shape

- Public mesh open to anyone willing to run a node.
- Federations that grow faster than humans can edit a list.
- Anywhere revocation cadence is faster than the deploy cadence.
