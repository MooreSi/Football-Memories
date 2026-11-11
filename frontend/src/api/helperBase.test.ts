import { expect, it } from "vitest";
import { helperBase, localiseHelperUrls } from "./helperBase";

it("talks to the helper directly on the Mac and through the app from other devices", () => {
  expect(helperBase({ hostname: "127.0.0.1", origin: "http://127.0.0.1:8765" })).toBe("http://127.0.0.1:8766");
  expect(helperBase({ hostname: "localhost", origin: "http://localhost:5173" })).toBe("http://127.0.0.1:8766");
  expect(helperBase({ hostname: "192.168.1.20", origin: "http://192.168.1.20:8765" })).toBe("http://192.168.1.20:8765/helper");
  expect(helperBase({ hostname: "simons-mac.local", origin: "http://simons-mac.local:8765" })).toBe("http://simons-mac.local:8765/helper");
});

it("rewrites the helper's own links so a phone can open thumbnails, streams and downloads", () => {
  const base = "http://192.168.1.20:8765/helper";
  const data = { thumbnail_url: "http://127.0.0.1:8766/account/match/a/thumbnail", nested: [{ url: "http://127.0.0.1:8766/files/s/moments/x.zip" }],
    title: "Not a link", other: "https://www.hudl.com/watch/video/a" };
  expect(localiseHelperUrls(data, base)).toEqual({ thumbnail_url: `${base}/account/match/a/thumbnail`, nested: [{ url: `${base}/files/s/moments/x.zip` }],
    title: "Not a link", other: "https://www.hudl.com/watch/video/a" });
  expect(localiseHelperUrls(data, "http://127.0.0.1:8766")).toEqual(data);
});
