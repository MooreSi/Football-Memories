# Hosted runtime security

The public entry point is maintained in `~/Football Memories Gateway`. Its dated security
report records the HTTP/TLS, authentication, network and image review. This app supplies the
per-family backend, web and capture images; the owner's local stack is separate.

Package audits and image audits answer different questions. An npm/pip audit can be clean
while Nginx, system libraries or embedded build tools have advisories. Scan actual running
image IDs, then rescan rebuilt images; rebuilding a tag does not update existing containers.
No image scan proves exploitability or absence of flaws. Keep unfixed findings visible.

Runtime Python/Nginx bases are pinned by digest. Apt installs available security updates at
build time, including packages already present in the base. Pip is removed only after all
dependencies (and, for capture, Chromium) are installed. Running containers do not need it.
Never rebuild/redeploy the owner's local stack as a side effect of hosted maintenance.
Never remove user data volumes, read credentials, or contact Hudl/Veo to smoke-test an image.
