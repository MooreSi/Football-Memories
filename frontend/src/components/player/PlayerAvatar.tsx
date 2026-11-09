import { initials } from "../TeamBadge";

const SIZES = {
  sm: "size-12 text-sm",
  md: "size-14 text-lg",
  lg: "size-28 text-4xl",
  xl: "size-40 text-5xl",
} as const;

/** The player's photo when there is one, otherwise their initials. */
export function PlayerAvatar({ name, photoUrl, size = "md", square = false }: {
  name: string; photoUrl: string | null; size?: keyof typeof SIZES; square?: boolean;
}) {
  const shape = square ? "rounded-[1.75rem]" : "rounded-full";
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`Photo of ${name}`}
        className={`${SIZES[size]} ${shape} shrink-0 object-cover ring-2 ring-accent/60 shadow-[0_0_40px_-6px_rgb(34_211_238/0.6)]`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${shape} grid shrink-0 place-items-center bg-gradient-to-br from-accent/90 to-[#2563eb] font-bold text-ink-950 shadow-[0_0_40px_-6px_rgb(34_211_238/0.6)]`}
    >
      {initials(name)}
    </span>
  );
}
