import type { InboxFile } from "./types";

/** Owner request 2026-11-14: send one video to the import folder's uploaded/ subfolder.
 *  XMLHttpRequest, not fetch, so a multi-GB match can show its progress. */
export function uploadVideo(file: File, progress: (fraction: number) => void): Promise<InboxFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/imports/upload?filename=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) progress(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { detail?: unknown } & Partial<InboxFile> = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status === 201) resolve(body as InboxFile);
      else reject(new Error(typeof body.detail === "string" ? body.detail : `The video could not be uploaded (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("The upload stopped before it finished. Nothing was kept; try again."));
    xhr.send(file);
  });
}
