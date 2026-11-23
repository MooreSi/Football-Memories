# 550: Admin-only local video analysis

Status: Local baseline deployed to admin preview; live browser acceptance blocked by locked Mac. Owner authorises new private GitHub repository, local pipeline,
selection of any Veo game, two-minute real analysis, end-to-end verification and
access only through the app's admin identity. AWS remains future work.

Worker: separate private MooreSi/Football-Video-Analytics repository and native
local Python environment. Gateway: full AdminSession guards all sample/job/result
and download routes, existing CSRF protections for writes. Shared local filesystem
queue avoids a new network service or source credentials. Feature disabled without
an explicit runtime directory mount. UI follows reference 02 workspace / reference
01 utility panels; private nav and route reuse the existing admin presentation gate.

Input: existing downloaded Veo MP4, extract seconds 300–420 into a new runtime file;
never overwrite/move the original or copy it into Git. First baseline is real
COCO detector inference, tracklets and unreviewed ball-proximity observations;
no confirmed pass/goal/tackle claims, named player inference or physical metrics.

Tests before implementation: worker media/integrity/failure and empty-detector
controls, gateway anonymous/user/partial-admin/CSRF/ownership/traversal/symlink
refusals, UI submit/poll/results/errors and access. Full required app/gateway gates
plus real two-minute run, output probe/checksums, browser desktop/phone review.
Deployment scoped to the gateway feature and admin library only; other library
images, databases, source connections, local legacy app and existing footage preserved.


Measured first real Faster R-CNN/MPS run:268.659s for120s of video at3fps inference,
with complete frame decode/export. Original SHA-256 unchanged; output fully
decodes, artifact hashes and ZIP CRC/sample bytes verified. This is a working
transport/inference baseline, not trained or validated Hudl-equivalent metadata.
Tracklet fragmentation and general COCO false positives remain substantial.

Admin-only app f70eef51 and gateway feature preview deployed; other libraries
unchanged. Admin auto updates paused (was true), global latest unchanged. Restore
admin update preference when this preview is retired/released. Browser desktop/
phone checks await owner unlock and admin session; existing auth guards stay in
place. See HANDOFF for all suite counts and worker TRIAL.md for benchmark evidence.
