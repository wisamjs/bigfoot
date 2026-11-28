import Image from "next/image";

/**
 * Bigfoot spot illustrations, in maroon fur (BIG-173, BIG-174, BIG-225, BIG-231). Decorative: an empty alt keeps
 * them out of the accessibility tree, so the text beside each one has to say everything. Transparent
 * WebP, so they sit on a card in light and dark mode alike. Small (under 85 KB, most under 45 KB) and
 * near the top of the page, so they load eagerly rather than pop in. Each sprite's comment says where
 * it goes; the ones marked with a ticket are placed by that ticket. illustrations.stories.tsx shows them all.
 */

type Props = { className?: string };

/** Bigfoot with a pencil and an empty checklist: no Applications yet (Dashboard). */
export function ClipboardBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-clipboard.webp" alt="" loading="eager" width={329} height={333} className={className} />;
}

/** Bigfoot waiting by an alarm clock: Applications waiting, no Interviews booked (Dashboard). */
export function ClockBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-alarm-clock.webp" alt="" loading="eager" width={346} height={323} className={className} />;
}

/** Bigfoot shrugging beside a blank calendar: no Interviews at all, "All quiet in the woods" (Dashboard). */
export function CalendarBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-shrug-calendar.webp" alt="" loading="eager" width={326} height={346} className={className} />;
}

/** Bigfoot pondering a blank desk calendar: an Application with no Interviews yet (Application page). */
export function PonderingCalendarBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-pondering-calendar.webp" alt="" loading="eager" width={316} height={347} className={className} />;
}

/** Bigfoot searching a folder with a magnifying glass: an Application that isn't there (Application not found). */
export function MagnifierBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-magnifier.webp" alt="" loading="eager" width={310} height={344} className={className} />;
}

/** Bigfoot scratching his head by a question-mark sign: Interview not found (BIG-228). */
export function QuestionSignBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-question-sign.webp" alt="" loading="eager" width={349} height={330} className={className} />;
}

/** Bigfoot holding an open, blank notebook: no Prep notes yet (Interview page, BIG-228). */
export function NotebookBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-notebook.webp" alt="" loading="eager" width={310} height={348} className={className} />;
}

/** Bigfoot writing on a sheet of paper: no Interview notes yet (Interview page, BIG-228). */
export function WritingBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-writing.webp" alt="" loading="eager" width={299} height={331} className={className} />;
}

/** Bigfoot jumping for joy: an Offer, on the Outcome card (BIG-227). */
export function CelebratingBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-celebrating.webp" alt="" loading="eager" width={391} height={442} className={className} />;
}

/** Bigfoot sitting with a tear in his eye: a Rejection, on the Outcome card (BIG-227). */
export function SadBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-sad.webp" alt="" loading="eager" width={421} height={390} className={className} />;
}

/** A Bigfoot family in a group hug: the people a Journey is shared with, in the Journey header (BIG-229). */
export function FamilyBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-family.webp" alt="" loading="eager" width={528} height={480} className={className} />;
}

/** Bigfoot peeking over the top of a card: the link-gone pages (BIG-229). */
export function PeekOverBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-peek-over.webp" alt="" loading="eager" width={587} height={358} className={className} />;
}

/** Bigfoot leaning out from behind a card's right edge: the Passcode page (BIG-229). */
export function PeekRightBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-peek-right.webp" alt="" loading="eager" width={339} height={480} className={className} />;
}

/** Bigfoot with both arms open in welcome: the home page hero, beside the heading (BIG-231). */
export function WelcomeBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-welcome.webp" alt="" loading="eager" width={456} height={480} className={className} />;
}

/** Bigfoot hugging a folder: the home page's Applications feature (BIG-231). */
export function FolderHugBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-folder-hug.webp" alt="" loading="eager" width={303} height={345} className={className} />;
}

/** Bigfoot writing on a clipboard: the home page's Interviews feature (BIG-231). */
export function ClipboardWritingBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-clipboard-writing.webp" alt="" loading="eager" width={290} height={346} className={className} />;
}

/** Bigfoot surprised by a desk calendar: the home page's Interview calendar feature (BIG-231). */
export function CalendarSurprisedBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-calendar-surprised.webp" alt="" loading="eager" width={356} height={333} className={className} />;
}

/** Bigfoot with two thumbs up: the home page's closing call to sign up (BIG-231). */
export function DoubleThumbsUpBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-double-thumbs-up.webp" alt="" loading="eager" width={343} height={480} className={className} />;
}

/** The welcome Bigfoot, header-sized: the signed-in header, beside the name. Its own small width so the image served stays small. */
export function HeaderBigfoot({ className }: Props) {
  return <Image src="/illustrations/bigfoot-welcome.webp" alt="" loading="eager" width={46} height={48} className={className} />;
}
