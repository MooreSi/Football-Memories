import { expect, it } from "vitest";
import { veoClubOf, veoClubNames } from "./veoClubs";

// Owner request 2026-11-15: one Veo account films two clubs, so a Veo match belongs to
// the club its title names first. Veo's own team field can be wrong. Synthetic names.
const m = (title: string, team: string | null = null) => ({ title, team });

it("names the clubs from the Veo team setting and Veo's team fields, once each", () => {
  expect(veoClubNames([m("a", "Riverside Juniors "), m("b", "Riverside Juniors"), m("c", null)], "Hill Town")).toEqual(["Hill Town", "Riverside Juniors"]);
});

it("takes the club from the first side of the title, by name, initials or a short start", () => {
  const known = ["Hill Town", "Riverside Juniors"];
  expect(veoClubOf(m("261108 HT vs Northgate CB", "Riverside Juniors"), known)).toBe("Hill Town");
  expect(veoClubOf(m("261109 RJ vs Eagles"), known)).toBe("Riverside Juniors");
  expect(veoClubOf(m("261024 Riverside Juniors vs. HT"), known)).toBe("Riverside Juniors");
  expect(veoClubOf(m("261024 Riverside vs Melton"), known)).toBe("Riverside Juniors");
  expect(veoClubOf(m("260913 Starlight vs Sutton"), known)).toBe("Starlight");
});

it("falls back to Veo's team field, then Other, when the title names no fixture", () => {
  const known = ["Hill Town", "Riverside Juniors"];
  expect(veoClubOf(m("Untitled recording 2026-09-14_04-29-21", "Riverside Juniors "), known)).toBe("Riverside Juniors");
  expect(veoClubOf(m("Untitled recording 2026-09-11_18-01-50"), known)).toBe("Other");
});
