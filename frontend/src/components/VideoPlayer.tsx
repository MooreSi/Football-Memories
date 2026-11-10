import {
  Maximize, Minimize, Pause, PictureInPicture2, Play, Repeat, SkipBack, SkipForward,
  StepBack, StepForward, Volume2, VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchEvent } from "../api/types";
import { type Buffers, clipWindow, nextEventIndex, previousEventIndex } from "../lib/events";
import { formatClock } from "../lib/format";

import { useHlsSource } from "../lib/useHlsSource";

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export interface PlayRequest {
  event: MatchEvent;
  nonce: number;
}

export interface SeekRequest {
  time: number;
  nonce: number;
}

interface Props {
  mediaId: number;
  src: string;
  poster?: string | null;
  fps: number | null;
  events: MatchEvent[]; // the currently filtered moments, sorted by time
  buffers: Buffers;
  momentsOnly: boolean;
  onMomentsOnlyChange: (on: boolean) => void;
  request: PlayRequest | null;
  seekRequest?: SeekRequest | null;
  onActiveEvent: (id: number | null) => void;
  onTime?: (time: number, duration: number) => void;
}

const RESUME_KEY = (id: number) => `fm.resume.${id}`;

function readResume(id: number): number {
  try {
    return Number(localStorage.getItem(RESUME_KEY(id)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeResume(id: number, t: number): void {
  try {
    localStorage.setItem(RESUME_KEY(id), String(Math.floor(t)));
  } catch {
    /* storage unavailable: resume is a convenience only */
  }
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const { label, className = "", ...rest } = props;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`grid size-9 place-items-center rounded-lg text-fg/90 transition hover:bg-white/10 hover:text-fg disabled:opacity-30 ${className}`}
    />
  );
}

export function VideoPlayer({
  mediaId, src, poster, fps, events, buffers, momentsOnly, onMomentsOnlyChange, request, seekRequest,
  onActiveEvent, onTime,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useHlsSource(videoRef, src);
  const shellRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<{ start: number; end: number; index: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const frame = 1 / (fps && fps > 0 ? fps : 25);

  const v = () => videoRef.current;

  const seek = useCallback((t: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(t, el.duration || t));
    setTime(el.currentTime);
  }, []);

  const playWindow = useCallback(
    (index: number) => {
      const el = videoRef.current;
      const e = events[index];
      if (!el || !e) return;
      const w = clipWindow(e, buffers, el.duration || Number.MAX_SAFE_INTEGER);
      windowRef.current = { ...w, index };
      onActiveEvent(e.id);
      seek(w.start);
      void el.play();
    },
    [events, buffers, onActiveEvent, seek],
  );

  // Parent asked to play a specific moment.
  useEffect(() => {
    if (!request) return;
    const index = events.findIndex((e) => e.id === request.event.id);
    if (index >= 0) playWindow(index);
  }, [request]);

  // Parent asked to jump to a time (e.g. a click on the moment timeline).
  useEffect(() => {
    if (!seekRequest) return;
    windowRef.current = null;
    seek(seekRequest.time);
  }, [seekRequest, seek]);

  // Entering "moments only" starts from the first filtered moment.
  useEffect(() => {
    if (momentsOnly && events.length > 0) playWindow(0);
    if (!momentsOnly) windowRef.current = null;
  }, [momentsOnly]);

  const onTimeUpdate = () => {
    const el = v();
    if (!el) return;
    setTime(el.currentTime);
    onTime?.(el.currentTime, el.duration || 0);
    const w = windowRef.current;
    if (w && el.currentTime >= w.end) {
      if (loop) {
        seek(w.start);
      } else if (momentsOnly && w.index + 1 < events.length) {
        playWindow(w.index + 1);
      } else if (momentsOnly) {
        el.pause();
        windowRef.current = null;
        onMomentsOnlyChange(false);
      } else {
        windowRef.current = null;
      }
    }
    if (Math.floor(el.currentTime) % 5 === 0) writeResume(mediaId, el.currentTime);
  };

  const onLoaded = () => {
    const el = v();
    if (!el) return;
    setDuration(el.duration);
    onTime?.(el.currentTime, el.duration);
    const resume = readResume(mediaId);
    if (!request && resume > 5 && resume < el.duration - 5) seek(resume);
  };

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = videoRef.current;
      if (!el) return;
      el.pause();
      seek(el.currentTime + dir * frame);
    },
    [frame, seek],
  );

  const jumpEvent = useCallback(
    (dir: 1 | -1) => {
      const el = videoRef.current;
      if (!el) return;
      const i = dir === 1 ? nextEventIndex(events, el.currentTime + buffers.pre) : previousEventIndex(events, el.currentTime + buffers.pre);
      if (i >= 0) playWindow(i);
    },
    [events, buffers.pre, playWindow],
  );

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts (documented in the player's help line below).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = videoRef.current;
      if (!el) return;
      const map: Record<string, () => void> = {
        " ": togglePlay,
        k: togglePlay,
        ArrowLeft: () => seek(el.currentTime - 5),
        ArrowRight: () => seek(el.currentTime + 5),
        j: () => seek(el.currentTime - 10),
        l: () => seek(el.currentTime + 10),
        ",": () => step(-1),
        ".": () => step(1),
        n: () => jumpEvent(1),
        p: () => jumpEvent(-1),
        f: toggleFullscreen,
        m: () => {
          el.muted = !el.muted;
          setMuted(el.muted);
        },
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seek, step, jumpEvent, toggleFullscreen]);

  const pipSupported = typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
  const total = duration || 0;

  return (
    <div ref={shellRef} className="group relative overflow-hidden rounded-2xl border border-line bg-black">
      <video
        ref={videoRef}
        src={src.includes(".m3u8") ? undefined : src}
        crossOrigin={src.includes(".m3u8") ? "anonymous" : undefined}
        poster={poster ?? undefined}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onVolumeChange={() => {
          const el = v();
          if (el) {
            setMuted(el.muted);
            setVolume(el.volume);
          }
        }}
        className={`w-full bg-black ${fullscreen ? "h-full" : "aspect-video"}`}
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-10 pb-2">
        <div className="relative mb-1 h-4">
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={total || 0}
            step={0.1}
            value={Math.min(time, total)}
            onChange={(ev) => seek(Number(ev.target.value))}
            className="absolute inset-x-0 bottom-0 h-1.5 w-full cursor-pointer accent-[#22d3ee]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-0.5 text-sm">
          <IconButton label={playing ? "Pause (space)" : "Play (space)"} onClick={togglePlay}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </IconButton>
          <IconButton label="Back 10 seconds (j)" onClick={() => seek(time - 10)}>
            <span className="text-[11px] font-semibold">-10</span>
          </IconButton>
          <IconButton label="Forward 10 seconds (l)" onClick={() => seek(time + 10)}>
            <span className="text-[11px] font-semibold">+10</span>
          </IconButton>
          <IconButton label="Previous frame (,)" onClick={() => step(-1)}>
            <StepBack size={16} />
          </IconButton>
          <IconButton label="Next frame (.)" onClick={() => step(1)}>
            <StepForward size={16} />
          </IconButton>
          <IconButton label="Previous moment (p)" onClick={() => jumpEvent(-1)} disabled={events.length === 0}>
            <SkipBack size={16} />
          </IconButton>
          <IconButton label="Next moment (n)" onClick={() => jumpEvent(1)} disabled={events.length === 0}>
            <SkipForward size={16} />
          </IconButton>
          <span className="ml-1 font-mono text-xs text-fg/90 tabular-nums">
            {formatClock(time)} / {formatClock(total)}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            <IconButton
              label={loop ? "Stop looping this moment" : "Loop this moment"}
              onClick={() => setLoop((x) => !x)}
              aria-pressed={loop}
              className={loop ? "text-accent" : ""}
            >
              <Repeat size={16} />
            </IconButton>
            <IconButton
              label={muted ? "Unmute (m)" : "Mute (m)"}
              onClick={() => {
                const el = v();
                if (el) el.muted = !el.muted;
              }}
            >
              {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </IconButton>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(ev) => {
                const el = v();
                if (el) {
                  el.volume = Number(ev.target.value);
                  el.muted = el.volume === 0;
                }
              }}
              className="hidden w-20 accent-[#22d3ee] sm:block"
            />
            <label className="sr-only" htmlFor={`speed-${mediaId}`}>
              Playback speed
            </label>
            <select
              id={`speed-${mediaId}`}
              value={speed}
              onChange={(ev) => {
                const s = Number(ev.target.value);
                setSpeed(s);
                const el = v();
                if (el) el.playbackRate = s;
              }}
              className="rounded-md border border-white/15 bg-black/50 px-1.5 py-1 text-xs"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
            {pipSupported && (
              <IconButton
                label="Picture in picture"
                onClick={() => {
                  const el = v();
                  if (!el) return;
                  if (document.pictureInPictureElement) void document.exitPictureInPicture();
                  else void el.requestPictureInPicture();
                }}
              >
                <PictureInPicture2 size={16} />
              </IconButton>
            )}
            <IconButton label={fullscreen ? "Exit full screen (f)" : "Full screen (f)"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </IconButton>
          </div>
        </div>
      </div>

      {momentsOnly && (
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full border border-accent/40 bg-black/70 px-3 py-1 text-xs text-accent">
          Playing moments only
          <button type="button" className="underline" onClick={() => onMomentsOnlyChange(false)}>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
