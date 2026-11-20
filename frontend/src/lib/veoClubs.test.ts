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

// Owner request 2026-11-20: one Veo account films many clubs, and titles name them many
// ways ("NL", "RCW", "Solihull Moors AB U9s", "SAFC Blues", "redditch United MA"). Made-up
// names below, in the same shapes as the owner's real titles.
const titles = [
  ...Array(4).fill("261115 CL vs Bolehall"), ...Array(6).fill("261101 Carlton Lindsey vs Eagles"),
  ...Array(3).fill("261108 RCH vs Northgate"), m("261109 Racing Club Hillford vs Ash", "Racing Club Hillford "),
  m("261102 Moorside Town AB U9s vs Ash", "Moorside Town"), m("261102 Moorside Town NC vs Ash"),
  m("261003 Westfield Academy Blue vs Oaks", "Westfield Academy Blue"),
  ...Array(3).fill("261004 Redbrook United MA vs Oaks"), m("261005 redbrook United u10 vs Elms"),
  ...Array(2).fill("261006 Kenmore Sporting vs Oaks"), m("261007 Kenmore vs Elms"),
  ...Array(3).fill("261008 Elm Ravens TB vs Oaks"), m("261009 Starlight vs Sutton"),
].map((t) => (typeof t === "string" ? m(t) : t));
const known = veoClubNames(titles, "Carlton Lindsay");
const club = (title: string) => veoClubOf(m(title), known);

it("learns the clubs the account films from recurring titles, without squad codes", () => {
  expect(known).toEqual(expect.arrayContaining(["Carlton Lindsey", "Racing Club Hillford", "Moorside Town",
    "Westfield Academy Blue", "Redbrook United", "Kenmore Sporting", "Elm Ravens"]));
  expect(known).not.toContain("Starlight"); // one match is not a club of the account
  expect(known).not.toContain("Kenmore");   // a short form of a club already known
  expect(known).not.toContain("Carlton Lindsay"); // the setting's spelling gives way to the titles'
});

it("names the club from initials, squad codes, age groups, plurals and spellings", () => {
  expect(club("261115 CL vs Bolehall")).toBe("Carlton Lindsey");
  expect(club("261101 Carlton Lindsay vs Eagles")).toBe("Carlton Lindsey");
  expect(club("261108 RCH vs Northgate")).toBe("Racing Club Hillford");
  expect(club("261102 Moorside Town AB U9s vs Ash")).toBe("Moorside Town");
  expect(club("261102 Moorside Town MJPL vs Ash")).toBe("Moorside Town");
  expect(club("261003 WAFC Blues vs Oaks")).toBe("Westfield Academy Blue");
  expect(club("261003 Westfield Blues vs Oaks")).toBe("Westfield Academy Blue");
  expect(club("261005 redbrook United MA vs Elms")).toBe("Redbrook United");
  expect(club("261005 Redbrook Sun vs Elms")).toBe("Redbrook United");
  expect(club("261007 Kenmore vs Elms")).toBe("Kenmore Sporting");
  expect(club("261008 Elm Ravens BT vs Oaks")).toBe("Elm Ravens");
});

it("finds the club on the second side when the first is the opponent", () => {
  expect(club("261120 Bolehall vs CL")).toBe("Carlton Lindsey");
});

it("leaves a name as written when it could be two known clubs, or none", () => {
  const two = [...known, "Moorside Academy"];
  expect(veoClubOf(m("261010 Moorside vs Oaks"), two)).toBe("Moorside");
  expect(club("260913 Starlight vs Sutton")).toBe("Starlight");
});

it("reads swapped letters and a squad code typed in lower case", () => {
  expect(club("240302 Westfield Acadmey Blue vs Esk")).toBe("Westfield Academy Blue");
  expect(club("240114 Moorside town ab v Ash")).toBe("Moorside Town");
});

it("reads a club's distinctive last word on its own, but not a common one", () => {
  const clubs = ["Hillford Moors", "Redbrook United", "Ashby United"];
  expect(veoClubOf(m("231126 Moors vs Rangers"), clubs)).toBe("Hillford Moors");
  expect(veoClubOf(m("231126 United vs Rangers"), clubs)).toBe("United");
  expect(veoClubNames([m("231217 Moors a/b vs Colts"), m("231126 Moors vs Rangers")], "Hillford Moors")).toEqual(["Hillford Moors"]);
});
