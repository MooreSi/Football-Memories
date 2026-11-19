import { expect, it } from "vitest";
import desktopConf from "../../nginx.conf?raw";
import hostedConf from "../../nginx.hosted.conf?raw";
import dockerfileText from "../../Dockerfile?raw";

/** Hosted gateway phase 2 (owner sign-off 2026-11-19; rewritten from task 080's "no helper
 *  route at all"): the hosted web server may route /helper/ and /stream/ only to the user's
 *  OWN capture container, and never to this computer or the owner's desktop helper. */
const OWNERS_HELPER = [/host\.docker\.internal/, /proxy_pass\s+http:\/\/(127\.0\.0\.1|localhost)/];

function upstreams(conf: string, location: string): string[] {
  const block = conf.split(`location ${location} {`)[1]?.split("}")[0] ?? "";
  return [...block.matchAll(/proxy_pass\s+([^;]+);/g)].map((m) => m[1]);
}

it("the hosted helper routes reach only the user's own capture container", () => {
  for (const location of ["/helper/", "/stream/"]) {
    expect(upstreams(hostedConf, location)).toEqual(["http://$capture:8766"]);
    const block = hostedConf.split(`location ${location} {`)[1].split("}")[0];
    expect(block).toMatch(/set \$capture capture;/);
  }
  expect(hostedConf).toMatch(/resolver 127\.0\.0\.11 /);
  for (const pattern of OWNERS_HELPER) expect(hostedConf).not.toMatch(pattern);
  expect(hostedConf).toMatch(/proxy_set_header Host 127\.0\.0\.1:8766;/);
  expect(hostedConf).toMatch(/server_tokens off;/);
  expect(hostedConf).toMatch(/location \/api\//);
});

it("the check would spot the owner's helper: the desktop config points there (negative control)", () => {
  expect(desktopConf).toMatch(OWNERS_HELPER[0]);
  expect(upstreams(desktopConf, "/helper/")).toEqual(["http://host.docker.internal:8766/"]);
});

it("the image picks the hosted config and build flag from one build argument", () => {
  expect(dockerfileText).toMatch(/ARG FM_HOSTED=0/);
  expect(dockerfileText).toMatch(/VITE_FM_HOSTED=\$FM_HOSTED/);
  expect(dockerfileText).toMatch(/nginx\.hosted\.conf/);
});
