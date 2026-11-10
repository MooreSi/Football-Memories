import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerProfile } from "../../api/types";
import { CARD_STYLES, PlayerCard } from "./PlayerCard";

const player: PlayerProfile = {
  id: 5, display_name: "Sam Example", shirt_number: "1", position: "GK", photo_url: null, is_primary: true,
  totals: { matches: 0, moments: 0, unwatched: 0, favourites: 0 }, categories: [], teams: [], per_match: [],
  teammates: [], first_match_date: null, latest_match_date: null,
};

describe("PlayerCard", () => {
  it("labels the moment count and shows games played instead of an abbreviation", () => {
    render(<PlayerCard player={player} moments={455} games={9} />);
    const card = screen.getByRole("figure", { name: "Sam Example player card" });
    expect(card).toHaveTextContent("455");
    expect(card).toHaveTextContent("Moments");
    expect(card).toHaveTextContent("9");
    expect(card).toHaveTextContent("Games");
    expect(card).not.toHaveTextContent(/\bTM\b/);
  });

  it("uses the singular for one game", () => {
    render(<PlayerCard player={player} moments={1} games={1} />);
    expect(screen.getByRole("figure")).toHaveTextContent("Game");
    expect(screen.getByRole("figure")).not.toHaveTextContent("Games");
  });

  it("shows the club crest when the player has a club, and the chosen style", () => {
    render(<PlayerCard player={{ ...player, club_name: "Aston Villa", card_style: "gold" }} moments={3} games={2} />);
    const card = screen.getByRole("figure");
    expect(card).toHaveAttribute("data-card-style", "gold");
    const crest = screen.getByRole("img", { name: "Aston Villa crest" });
    expect(crest).toHaveAttribute("src", "/api/team-logo?name=Aston%20Villa");
  });

  it("has no crest without a club and falls back to the classic style", () => {
    render(<PlayerCard player={player} moments={0} games={0} />);
    expect(screen.queryByRole("img", { name: /crest/ })).toBeNull();
    expect(screen.getByRole("figure")).toHaveAttribute("data-card-style", "classic");
  });

  it("offers several named styles including gold and silver", () => {
    const ids = CARD_STYLES.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["classic", "gold", "silver", "bronze"]));
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });
});
