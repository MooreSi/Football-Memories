/** The one Node built-in a test reads with (selectStyle.test.ts): Vitest hands CSS imports
 *  back empty (`css: false`), and the project has no @types/node. */
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
