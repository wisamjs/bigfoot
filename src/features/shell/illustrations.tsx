import Image from "next/image";

/**
 * Spot illustrations for empty states (BIG-173, BIG-174). Decorative: an empty alt keeps them out of the
 * accessibility tree, so the text beside each one has to say everything. Transparent WebP, so they
 * sit on a card in light and dark mode alike. Small (under 60 KB) and near the top of the page, so
 * they load eagerly rather than pop in.
 */

type Props = { className?: string };

/** Bigfoot with a pencil and an empty checklist: no Applications yet. */
export function ClipboardBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-clipboard.webp" alt="" loading="eager" width={640} height={530} className={className} />;
}

/** Bigfoot sitting by an empty calendar: no Interviews at all. */
export function CalendarBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-calendar.webp" alt="" loading="eager" width={640} height={585} className={className} />;
}

/** Bigfoot holding a calendar and checking the time: Applications waiting, no Interviews booked. */
export function ClockBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-clock.webp" alt="" loading="eager" width={606} height={640} className={className} />;
}

/** Bigfoot waving beside two blank profile cards: an Application with no Interviews yet (BIG-174). */
export function InterviewCardsBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-interview-cards.webp" alt="" loading="eager" width={640} height={427} className={className} />;
}

/** Bigfoot puzzling over an empty folder: an Application that isn't there (BIG-174). */
export function EmptyFolderBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-empty-folder.webp" alt="" loading="eager" width={585} height={640} className={className} />;
}
