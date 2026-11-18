# Hosted gateway: the changes, in plain English

What changes and why, without code. Numbers are starting points.

---

## 1. A front door that is separate from the app

**Problem:** the app has no login. Putting it on a network means anyone on it sees the footage.

| Change | Before | After |
|---|---|---|
| What people reach | The app itself, port 8765 | Only the front door (one HTTPS port); the apps behind it have no ports at all |
| Where the front door's code lives | n/a | Its own private repo and its own database, apart from the app |
| What the front door holds | n/a | Accounts, sessions, admin page. Never footage |

## 2. Accounts

**Problem:** there are no users today.

| Change | Before | After |
|---|---|---|
| Sign up | n/a | Name, email, password. Account waits for the admin's approval |
| Passwords | n/a | Stored only as a slow one-way hash; never readable, never logged |
| Sign in | n/a | Email and password; repeated wrong attempts slow down, then lock for a while |
| Second factor | n/a | Authenticator app code required for the admin, offered to users |
| Staying signed in | n/a | A cookie the browser's scripts cannot read, only sent over HTTPS, ends after inactivity |

## 3. Each user gets their own app

**Problem:** one shared app would mix families' footage.

| Change | Before | After |
|---|---|---|
| On approval | n/a | A private copy of the app starts for that user: its own database, files and network |
| What a user's copy can reach | n/a | Nothing: not other users, not the internet (phase 1), not this Mac, not the owner's Hudl helper |
| Who can start copies | n/a | One small internal service, allowed only a short list of Docker actions |
| Disk | n/a | A limit per user (50 GB to start); uploads refused past it |

## 4. Getting a signed-in user to their app

| Change | Before | After |
|---|---|---|
| Where requests go | n/a | The front door looks up who is signed in and forwards only to that person's copy. Changing the web address cannot reach someone else's |

## 5. Admin page (owner only)

| Shows | Detail |
|---|---|
| Who registered | name, email, date, status (waiting / approved / suspended) |
| Disk used | per user, against their limit |
| Activity | last sign-in, failed sign-ins, sign-ins in the last 30 days |
| Their app | running / stopped / failed, when it started, app version |
| Actions | approve, suspend, resume, change limit, restart their app, delete (typed confirmation, never automatic) |
| Not shown | the user's footage, players or matches |

## 6. Later phases

- **Phase 2:** a user can connect their own Hudl or Veo account inside their copy, with their own
  permission, with no visible browser. Built only after the owner signs off each step.
- **Phase 3:** a domain name and a Cloudflare Tunnel, so no router port is opened and the
  certificate is a real one.

---

*Scope:* phase 1 ships together and is tested on the local network only. **Not doing:** payments,
email, the owner's own app moving behind the front door, off-machine backups of users' copies.
