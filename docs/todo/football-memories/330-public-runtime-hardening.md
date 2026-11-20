# 330: runtime image hardening (2026-11-20)

Owner asked for a full security review of the public website. The gateway's image scan
found patchable packages in hosted app images: outdated Nginx/Alpine, a zlib security
update, and pip left in runtime images after installation. The Gateway repo contains
the public application fixes and full dated report.

Pin runtime base images to inspected official digests. Install available system security
updates at build time, remove pip once dependencies and Chromium are installed, and use
the current stable Nginx image. Preserve all application code, configuration defaults,
volume ownership, secret handling and existing library contents. Build-only tools are
never needed by running containers. The owner's local stack must not be redeployed.

Tests first for Dockerfile invariants; complete backend SQLite/Postgres, lint/format/type,
schema drift and frontend test/type/build checks. Build hosted images and smoke-test the
image without real data or accounts. Record scan findings honestly, including unfixed
upstream packages. Library-container deployment requires care not to disturb live capture;
no data-volume removal, database image upgrade or authentication against Hudl/Veo.
