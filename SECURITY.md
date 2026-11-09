# Security and privacy

This app stores footage of children. Privacy is a requirement, not a feature.

## Current protections

| Area | Protection | Where |
|---|---|---|
| Network exposure | Ports bound to `127.0.0.1` only; no LAN access until authentication exists | `docker-compose.yml`, D-008 |
| Hudl account | No automation of Hudl at all; no Hudl credentials stored | HUDL_INTEGRATION.md |
| Path traversal | Every user-supplied name goes through `safe_join` (rejects `..`, absolute paths, symlink escapes) | `backend/app/services/paths.py` + tests |
| Inbox originals | Mounted read-only in Docker; importer copies, never moves/deletes | compose, importer tests |
| Archive integrity | `.part` + SHA-256 verify + rename; never overwrites; dedup by hash | importer + tests |
| Secrets in logs | Redacting log filter for password/token/cookie/authorization | `logging_setup.py` + tests |
| Secrets in git | `.env`, cookies, storage-state, footage, `data/` gitignored | `.gitignore` |
| Input validation | Pydantic schemas with length limits; CSV sidecar validated before any copy | `schemas.py`, `sidecar.py` |
| Player photos | Re-encoded by ffmpeg to a 512x512 JPEG: validates it is a real image and strips all metadata (EXIF GPS location, device, timestamps); 10 MB limit; client file name never used; stored only under the local archive | `services/photos.py` + tests incl. a planted GPS string |
| Storage checks | The archive write test creates one `.fm-probe-*` file and deletes it at once; the import folder is never written to | `services/storage.py` + tests |
| Third-party requests | None: no CDN fonts or scripts; the UI is fully self-hosted | `frontend/index.html` |

## Not yet built (required before LAN access)

- User authentication, secure session cookies, CSRF protection.
- Encrypted secrets at rest (only needed once a connector holds credentials).
- Data export/deletion controls and explicit sharing consent.

## Reporting

Private project. Raise issues with the owner directly; never paste footage,
real names, `.env` contents or logs with personal data into an issue.
