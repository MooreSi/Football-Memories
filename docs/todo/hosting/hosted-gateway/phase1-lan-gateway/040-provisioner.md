# 040: Provisioner

**Status:** done (2026-11-18, gateway e4f3976). Socket filter is our own HAProxy config, not tecnativa (its CONTAINERS=1 + POST=1 also allows exec). Idle memory of one user stack measured at about 160 MB.
**Depends on:** 010, 080 (needs the hosted-mode images)
**Real-money surface:** no (but `/safe-change`: Docker access and deleting user volumes)
**Leverage:** `docker-compose.yml` in this repo as the template for one user's stack

## Problem

Approving a user must start their own app. Whatever can create containers can, if abused, own this
Mac, so this is the most dangerous piece of the whole plan.

## Decision

A separate internal service with a tiny API, reachable only from `gateway` on `fm-gw-internal`,
authenticated by a shared key from Docker secrets (HMAC over method, path, body, timestamp; 30 s
window). It accepts **only a user id** and an action; it never takes an image name, mount, command
or option from the request.

Actions: `create`, `start`, `stop`, `restart`, `status`, `usage`, `erase` (erase needs the
gateway to pass the admin's typed confirmation and is the only delete; QUESTIONS 8).

It talks to Docker Engine's HTTP API through a socket filter proxy that allows only
containers, networks, volumes and system/df endpoints, and denies exec, build, images pull, swarm,
plugins, secrets, auth. Exact proxy image and its allow-list flags to be verified against its docs
before use (candidate in QUESTIONS 7). No Docker SDK: plain `httpx` to the proxy.

Per user `u<id>` (short hash of the uuid, never the email), the provisioner creates:

| Resource | Settings |
|---|---|
| network `fm-u-<id>` | `internal: true`, labels `fm.owner=<id>` |
| volumes `fm-u-<id>-db`, `-archive`, `-inbox` | labels `fm.owner` |
| `db` | `postgres:17-alpine` pinned digest, random password generated per user and written to a per-user Docker secret file under `secrets/users/` (600) |
| `backend` | hosted-mode image (080) pinned tag; non-root; `read_only: true` with tmpfs `/tmp`; `cap_drop: ALL`; `no-new-privileges`; memory 1 GB, cpus 1.0, pids 256; `FM_HOSTED=1`, `FM_QUOTA_BYTES` |
| `web` | hosted-mode nginx image; same hardening; no `extra_hosts`; joined also by `gateway` |

Every container carries labels `fm.owner`, `fm.role`. The provisioner refuses to act on anything
without its `fm.owner` label, so it can never touch the owner's own `football-memories` stack or
any other container on this Mac. User cap (QUESTIONS 4) enforced here.

`usage` returns per-volume bytes from Docker's system df (verify the field on Docker 29.9) plus
container state, started time, restarts, memory.

## Tests first (TDD)

`provisioner/tests/` against a fake Docker API (respx), no real Docker:
- `test_auth.py`: missing, wrong or stale HMAC -> 401; replayed request -> 401.
- `test_create.py`: the exact container specs above are sent (hardening flags present, no ports, no
  `extra_hosts`, network internal); a user id with path or shell characters is refused.
- `test_scope.py`: an action on a container without `fm.owner` -> refused before any Docker call;
  the owner's `football-memories-*` containers are never listed or touched (negative control:
  remove the label check and the test goes red).
- `test_cap.py`: 11th create refused when the cap is 10.
- `test_erase.py`: erase without confirmation -> refused; with it, only that user's volumes.
- One opt-in integration test (`-m docker`, never in the default suite) creates and erases a real
  throwaway user stack and asserts with `docker inspect` that nothing is published and the network
  is internal.

## What to do

1. Tests; red.
2. Service, socket proxy in compose on `fm-gw-docker` (internal), socket mounted read-only into the
   proxy only.
3. Measure idle memory of one user stack and record it in QUESTIONS 4.

## Acceptance

- Approving a user in the admin page creates exactly their stack; `docker ps` shows no published
  ports on it; `docker network inspect` shows `Internal: true`.
- The owner's own stack is untouched (container ids before and after identical).
