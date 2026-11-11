import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Download, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { hudlBlocked, hudlRequest, useHudlLibrary, useHudlStatus, hudlAgeGroups } from "../api/hudl";
import { TeamBadge } from "../components/TeamBadge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { fixtureLabel } from "../lib/hudlFixture";
import {
  CARD_SECONDS, type CardSpec, type Crests, H, THEMES, type ThemeId, W,
  blobToBase64, drawCard, loadCrest, matchCard, recordCard,
} from "../lib/reelCards";
import { timeLeft } from "../lib/taggedPlayback";
import { useHomeClub } from "../lib/useHomeClub";

export type ReelItem = { match_id: string; moment_ids?: string[]; codes?: string[] };
export type ReelSelection = { items: ReelItem[]; name?: string; per_match?: boolean };
const KEY = "fm.reel.selection";

function storedSelection(): ReelSelection | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}

/** Live, looping preview of one card. */
function CardPreview({ card, theme, crests }: { card: CardSpec; theme: ThemeId; crests: Crests }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext("2d"); } catch { ctx = null; }
    if (!ctx) return;
    const seconds = CARD_SECONDS[card.kind] + 0.8;
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const t = ((performance.now() - start) / 1000) % seconds / CARD_SECONDS[card.kind];
      drawCard(ctx, card, theme, Math.min(1, t) * 0.999, crests);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [card, theme, crests]);
  return <canvas ref={ref} width={W} height={H} role="img" aria-label={`${card.title} title card preview`} className="aspect-video w-full rounded-xl border border-white/10 bg-black" />;
}

function ThemePicker({ label, value, onChange }: { label: string; value: ThemeId; onChange: (t: ThemeId) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs text-fg-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEMES.map((t) => (
          <label key={t.id} title={t.blurb} className={`theme-swatch theme-${t.id} cursor-pointer rounded-xl border p-2.5 text-xs ${value === t.id ? "border-accent ring-1 ring-accent/60" : "border-white/10 hover:border-white/30"}`}>
            <input type="radio" name={label} className="sr-only" checked={value === t.id} onChange={() => onChange(t.id)} aria-label={t.label} />
            <span className="block font-semibold text-white">{t.label}</span>
            <span className="block text-[11px] text-white/70">{t.blurb}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Spec 190: build a highlight reel from Hudl moments, with animated opening, match and closing cards. */
export function ReelStudioPage() {
  const location = useLocation();
  const selection = (location.state as ReelSelection | null) ?? storedSelection();
  useEffect(() => { if (selection?.items?.length) sessionStorage.setItem(KEY, JSON.stringify(selection)); }, [selection]);
  if (!selection?.items?.length) {
    return <EmptyState icon={Clapperboard} title="Choose moments first">
      Pick moments on a match in <Link to="/clips" className="text-accent underline">Clips</Link> and press Make Highlight Reel, or use Batch download.
    </EmptyState>;
  }
  return <Studio selection={selection} />;
}

function Studio({ selection }: { selection: ReelSelection }) {
  const library = useHudlLibrary();
  const status = useHudlStatus();
  const qc = useQueryClient();
  const club = useHomeClub();
  const rows = selection.items.map((item) => {
    const match = library.data?.find((m) => m.id === item.match_id);
    const moments = (match?.moments ?? []).filter((m) => item.moment_ids?.length ? item.moment_ids.includes(m.id) : item.codes?.includes(m.category));
    return { item, match, moments };
  });
  const totalMoments = rows.reduce((n, r) => n + r.moments.length, 0);
  const seasons = [...new Set(rows.map((r) => r.match?.season_label).filter(Boolean))];
  const [edited, setName] = useState<string | null>(null);
  // Derived until edited, so the club and library can load first.
  const name = edited ?? (selection.name || (rows.length === 1 && rows[0].match ? fixtureLabel(rows[0].match.title, club, "") : "Highlights"));
  // Spec 200: one file per match, each opened by its match card (no opening card).
  const [separate, setSeparate] = useState(Boolean(selection.per_match));
  const [openingOn, setOpening] = useState(true);
  const opening = openingOn && !separate;
  const [openingTitle, setOpeningTitle] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [openingTheme, setOpeningTheme] = useState<ThemeId>("floodlights");
  const [perMatch, setPerMatch] = useState(true);
  const [matchTheme, setMatchTheme] = useState<ThemeId>("kickoff");
  const [closing, setClosing] = useState(true);
  const [closingText, setClosingText] = useState("Thanks for watching");
  const [closingTheme, setClosingTheme] = useState<ThemeId>("gold");
  const [preview, setPreview] = useState(0);
  const [phase, setPhase] = useState("");
  const [crests, setCrests] = useState<Crests>({});

  const defaultSubtitle = [seasons.join(" & "), `${rows.length} ${rows.length === 1 ? "match" : "matches"}`, `${totalMoments} moments`].filter(Boolean).join(" · ");
  const openingCard: CardSpec = { kind: "opening", title: openingTitle ?? name, subtitle: subtitle ?? defaultSubtitle };
  const matchCards = rows.map((r) => r.match ? matchCard(r.match.title, club, { age: hudlAgeGroups(r.match)[0], moments: r.moments.length }) : { kind: "match" as const, title: r.item.match_id });
  const closingCard: CardSpec = { kind: "closing", title: closingText || " ", subtitle: club || undefined };
  const cards = useMemo(() => [
    ...(opening ? [{ card: openingCard, theme: openingTheme, label: "Opening" }] : []),
    ...(perMatch ? matchCards.map((c, i) => ({ card: c, theme: matchTheme, label: `Match ${i + 1}` })) : []),
    ...(closing ? [{ card: closingCard, theme: closingTheme, label: "Closing" }] : []),
  ], [opening, perMatch, closing, openingCard.title, openingCard.subtitle, openingTheme, matchTheme, closingTheme, closingText, club, library.data]);
  const shown = cards[Math.min(preview, cards.length - 1)];

  const names = [...new Set(matchCards.flatMap((c) => [c.home, c.away]).filter((n): n is string => Boolean(n)))];
  useEffect(() => {
    let live = true;
    void Promise.all(names.map(async (n) => [n, await loadCrest(n)] as const)).then((loaded) => { if (live) setCrests(Object.fromEntries(loaded)); });
    return () => { live = false; };
  }, [names.join("|")]);

  const make = useMutation({
    mutationFn: async () => {
      const upload = async (card: CardSpec, theme: ThemeId) => {
        const blob = await recordCard(card, theme, crests);
        return (await hudlRequest<{ card_id: string }>("/reel/cards", { data: await blobToBase64(blob) })).card_id;
      };
      const count = (opening ? 1 : 0) + (perMatch ? rows.length : 0) + (closing ? 1 : 0);
      let n = 0;
      const step = () => setPhase(`Recording title card ${++n} of ${count}…`);
      if (opening) step();
      const openingId = opening ? await upload(openingCard, openingTheme) : null;
      const ids: (string | null)[] = [];
      for (const card of matchCards) { if (perMatch) { step(); ids.push(await upload(card, matchTheme)); } else ids.push(null); }
      if (closing) step();
      const closingId = closing ? await upload(closingCard, closingTheme) : null;
      setPhase("Fetching moments and assembling the reel…");
      await hudlRequest("/account/batch", {
        items: selection.items.map((item, i) => ({ ...item, ...(ids[i] ? { card_id: ids[i] } : {}) })),
        combined: true,
        reel: { name, opening_card: openingId, closing_card: closingId, ...(separate ? { per_match: true } : {}) },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hudl-account"] }),
    onError: () => setPhase(""),
  });

  const progress = status.data?.progress;
  const finished = status.data?.state === "done" && status.data.download_kind === "reel" && status.data.download_url;
  const savedMany = separate && make.isSuccess && status.data?.state === "done" && !status.data.busy && !status.data.match_id;
  const makeLabel = separate ? `Make ${rows.length} highlight ${rows.length === 1 ? "reel" : "reels"}` : "Make highlight reel";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/clips" className="text-sm text-fg-muted hover:text-fg">← Clips</Link>
          <p className="screen-eyebrow mt-3">HIGHLIGHT REEL STUDIO</p>
          <input aria-label="Reel name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full max-w-2xl bg-transparent text-3xl font-semibold tracking-tight outline-none focus:ring-1 focus:ring-accent/50" />
          <p className="mt-1 text-sm text-fg-muted">{totalMoments} moments from {rows.length} {rows.length === 1 ? "match" : "matches"} · encoded at the best source quality</p>
          {totalMoments > 150 && !separate && <p className="mt-1 text-sm text-warn">That is a long reel. Pick a player or code, or tick the moments you want, for a shorter one.</p>}
        </div>
        <Button variant="primary" disabled={make.isPending || hudlBlocked(status.data) || totalMoments === 0} onClick={() => make.mutate()}>
          <Sparkles size={16} aria-hidden /> {makeLabel}
        </Button>
      </header>

      {(make.isPending || phase || progress || finished || savedMany || make.isError) && (
        <section aria-label="Reel progress" className="panel space-y-2 p-4">
          {make.isError && <p role="alert" className="text-sm text-danger">{make.error.message}</p>}
          {phase && !progress && !finished && !savedMany && <p role="status" className="text-sm">{phase}</p>}
          {progress && <>
            <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Step {progress.step} of {progress.steps}: {progress.label}</span><span className="text-fg-muted">{Math.round(progress.fraction * 100)}% · {timeLeft(progress.eta_s)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-ok to-accent transition-[width]" style={{ width: `${Math.max(2, progress.fraction * 100)}%` }} /></div>
          </>}
          {status.data?.state === "error" && phase && <p role="alert" className="text-sm text-danger">{status.data.message}</p>}
          {finished && <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-ok">{status.data!.message}</p>
            <a href={status.data!.download_url} className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong px-4 text-sm font-semibold text-white"><Download size={14} aria-hidden /> Save reel</a>
            <Link to="/downloaded" className="text-sm text-accent underline">All downloads</Link></div>}
          {savedMany && !finished && <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-sm text-ok">{status.data!.message}</p>
            <Link to="/downloaded" className="text-sm text-accent underline">See them in Downloaded</Link></div>}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label="Card preview" className="space-y-3">
          {shown ? <CardPreview card={shown.card} theme={shown.theme} crests={crests} /> : <div className="panel grid aspect-video place-items-center text-sm text-fg-muted">No title cards: the reel is moments only.</div>}
          <div role="tablist" aria-label="Cards" className="flex flex-wrap gap-1.5">
            {cards.map((c, i) => (
              <button key={`${c.label}-${i}`} role="tab" aria-selected={i === preview} type="button" onClick={() => setPreview(i)}
                className={`rounded-full px-3 py-1.5 text-xs ${i === preview ? "bg-accent/20 text-fg ring-1 ring-accent/50" : "bg-white/5 text-fg-muted hover:text-fg"}`}>{c.label}</button>
            ))}
          </div>
          <ol aria-label="Matches in this reel" className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.item.match_id} className="tile flex items-center gap-3 p-3">
                <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">{i + 1}</span>
                {matchCards[i].away && <span className="flex -space-x-2"><TeamBadge name={matchCards[i].home!} size="sm" /><TeamBadge name={matchCards[i].away!} size="sm" tone="away" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{matchCards[i].title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{[matchCards[i].date, `${r.moments.length} moments`].filter(Boolean).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <fieldset className="tile space-y-2 p-4">
            <legend className="sr-only">Save as</legend>
            <p className="text-sm font-semibold">Save as</p>
            <div className="grid grid-cols-2 gap-2">
              {([[false, "One reel", "Every match in one file"], [true, "One reel per match", "A file for each match"]] as const).map(([value, label, hint]) => (
                <label key={label} className={`cursor-pointer rounded-xl border p-2.5 text-xs ${separate === value ? "border-accent ring-1 ring-accent/60" : "border-white/10 hover:border-white/30"}`}>
                  <input type="radio" name="reel-output" className="sr-only" checked={separate === value} onChange={() => { setSeparate(value); setPreview(0); }} aria-label={label} />
                  <span className="block font-semibold text-fg">{label}</span>
                  <span className="block text-[11px] text-fg-muted">{hint}</span>
                </label>
              ))}
            </div>
            {separate && <p className="text-xs text-fg-muted">Each file starts with its match card and ends with the closing card.</p>}
          </fieldset>
          {!separate && <div className="tile space-y-3 p-4">
            <label className="flex items-center justify-between text-sm font-semibold">Opening card
              <input type="checkbox" checked={opening} onChange={(e) => setOpening(e.target.checked)} aria-label="Opening card" /></label>
            {opening && <>
              <input className="field" aria-label="Opening title" value={openingTitle ?? name} onChange={(e) => setOpeningTitle(e.target.value)} maxLength={80} />
              <input className="field" aria-label="Opening subtitle" value={subtitle ?? defaultSubtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} />
              <ThemePicker label="Opening style" value={openingTheme} onChange={(t) => { setOpeningTheme(t); setPreview(0); }} />
            </>}
          </div>}
          <div className="tile space-y-3 p-4">
            <label className="flex items-center justify-between text-sm font-semibold">Title card before each match
              <input type="checkbox" checked={perMatch} onChange={(e) => setPerMatch(e.target.checked)} aria-label="Title card before each match" /></label>
            <p className="text-xs text-fg-muted">Filled in automatically: both crests, the opponent, the date (UK format), age group, venue and moment count.</p>
            {perMatch && <ThemePicker label="Match card style" value={matchTheme} onChange={(t) => { setMatchTheme(t); setPreview(opening ? 1 : 0); }} />}
          </div>
          <div className="tile space-y-3 p-4">
            <label className="flex items-center justify-between text-sm font-semibold">Closing card
              <input type="checkbox" checked={closing} onChange={(e) => setClosing(e.target.checked)} aria-label="Closing card" /></label>
            {closing && <>
              <input className="field" aria-label="Closing text" value={closingText} onChange={(e) => setClosingText(e.target.value)} maxLength={80} />
              <ThemePicker label="Closing style" value={closingTheme} onChange={(t) => { setClosingTheme(t); setPreview(cards.length - 1); }} />
            </>}
          </div>
          <p className="text-xs text-fg-subtle">Cards are animated in this browser, recorded, and joined to the moments by the desktop helper. Keep this tab open while the cards record (a few seconds each).</p>
        </aside>
      </div>
    </div>
  );
}
