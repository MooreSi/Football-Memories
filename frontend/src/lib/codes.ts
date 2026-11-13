/** Tag codes compared the way the helper merges them (spec 230): case and spacing ignored. */
export function codeKey(code: string): string {
  return code.split(/\s+/).filter(Boolean).join(" ").toUpperCase();
}
export function sameCode(a: string, b: string): boolean {
  return codeKey(a) === codeKey(b);
}
