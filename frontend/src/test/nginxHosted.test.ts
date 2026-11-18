import { expect, it } from "vitest";
import desktopConf from "../../nginx.conf?raw";
import hostedConf from "../../nginx.hosted.conf?raw";
import dockerfileText from "../../Dockerfile?raw";

/** Task 080: the hosted web server must have no route to the owner's desktop helper. */
const HELPER = [/location\s+\/helper\//, /location\s+\/stream\//, /host\.docker\.internal/, /8766/];

it("the hosted nginx config has no helper route", () => {
  const hosted = hostedConf;
  for (const pattern of HELPER) expect(hosted).not.toMatch(pattern);
  expect(hosted).toMatch(/server_tokens off;/);
  expect(hosted).toMatch(/location \/api\//);
});

it("the check would find them: the desktop config has every one (negative control)", () => {
  const desktop = desktopConf;
  for (const pattern of HELPER) expect(desktop).toMatch(pattern);
});

it("the image picks the hosted config and build flag from one build argument", () => {
  const dockerfile = dockerfileText;
  expect(dockerfile).toMatch(/ARG FM_HOSTED=0/);
  expect(dockerfile).toMatch(/VITE_FM_HOSTED=\$FM_HOSTED/);
  expect(dockerfile).toMatch(/nginx\.hosted\.conf/);
});
