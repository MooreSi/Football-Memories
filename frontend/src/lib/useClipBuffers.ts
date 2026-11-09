import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { type Buffers, DEFAULT_BUFFERS } from "./events";

/** The owner's saved clip timing (Settings > Playback), falling back to the defaults. */
export function useClipBuffers(): Buffers {
  const q = useQuery({ queryKey: ["settings"], queryFn: api.settings, staleTime: 60_000 });
  return q.data ? { pre: q.data.clip_pre_s, post: q.data.clip_post_s } : DEFAULT_BUFFERS;
}
