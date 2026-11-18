# Hosted gateway: decisions to confirm

Each has a recommendation; "go with the recommendations" is a valid answer. Answer inline under
`ANSWER:`. Answered items stay, annotated.

## The decisions (quick list)
1. How big is each user's disk limit, and what happens at it?
2. Who needs an authenticator code at sign-in?
3. Can the admin look inside a user's library?
4. How many users at most on this Mac?
5. Does your own app move behind the front door later?
6. Are users' copies backed up?
7. May the gateway use these new dependencies?
8. Deleting a user: what happens to their files?

---

## 1. Disk limit per user?
You had no preference. Docker Desktop's volumes cannot be capped by size, so the limit is enforced
by the app refusing uploads and captures past it; the admin page warns at 80%.

- **50 GB each, uploads refused at the limit, you can change it per user (Recommended)**
- **No limit, admin page only shows usage**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 2. Authenticator codes (TOTP)?
- **Required for the admin, optional for users (Recommended)**: your account controls every
  user's app.
- **Required for everyone**: safer for families, one more setup step.
- **Nobody**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 3. Can the admin see inside a user's library?
These are other people's children. The admin page shows sizes, dates and status only.

- **No, metadata only (Recommended)**
- **Yes, an "open as user" button, recorded in an audit log**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 4. How many users at most?
Each copy is three containers (about 300-500 MB of memory idle, to be measured in task 040).

- **10, the provisioner refuses beyond it, you can raise it (Recommended)**
- **A different number**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 5. Does your own app move behind the front door?
- **No, it stays on port 8765 on this Mac as today (Recommended)**: the gateway and your app share
  nothing.
- **Yes, later, as one of the users**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 6. Backups of users' copies?
- **None in phase 1; users are told at sign-up that this is a test service (Recommended)**
- **Nightly database backup per user to a folder you choose**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 7. New dependencies for the gateway (none installed until approved)
Backend: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg`, `pydantic-settings` (all as in
the app), plus `argon2-cffi` (password hashing) and `pyotp` (authenticator codes). Images:
`caddy` (HTTPS edge), `postgres:17-alpine` (as the app), and a Docker socket filter proxy
(candidate: `tecnativa/docker-socket-proxy`, exact image and tag to be verified in task 040).
Frontend: the app's own set (React, TanStack Query, React Router, Tailwind, lucide-react).

- **Approve this list (Recommended)**
- **Change it**

ANSWER: (2026-11-18) Owner: go with the recommendation.

## 7a. Added later (2026-11-18)
`cryptography` (AES-GCM for authenticator secrets; phase 2 will reuse it).

ANSWER: (2026-11-18) Owner: yes, add it.

## 7b. Added later (2026-11-18)
`qrcode` (npm, draws the authenticator QR in the browser).

ANSWER: (2026-11-18) Owner: yes, add it.

## 8. Deleting a user
- **Delete stops their app and removes the account; their files are kept until you press
  "Erase data" with a typed confirmation (Recommended)**
- **Delete erases everything at once**

ANSWER: (2026-11-18) Owner: go with the recommendation.

---

## Quick-confirm checklist
- [x] 1 quota
- [x] 2 TOTP
- [x] 3 admin visibility
- [x] 4 user cap
- [x] 5 owner's app
- [x] 6 backups
- [x] 7 dependencies
- [x] 8 delete
