import Image from "next/image";
import type { CurrentUser } from "@/lib/dal";

const SIZES = { sm: { px: 32, className: "size-8 text-xs" }, md: { px: 40, className: "size-10 text-sm" } } as const;

/** The first letters of the first and last words of a name: "Wisam Zaghal" is "WZ", "Cher" is "C". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

/** avatars.md: circular, cover fit; the job seeker's initials when Google has no photo. Decorative. */
export function Avatar({ user, size = "sm" }: { user: CurrentUser; size?: keyof typeof SIZES }) {
  const { px, className } = SIZES[size];
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={px}
        height={px}
        className={`${className} rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-fg-brand-strong`}
    >
      {initials(user.name || user.firstName)}
    </span>
  );
}
