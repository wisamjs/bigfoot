// A story's "now" (parameters.now, an ISO timestamp): `new Date()` and `Date.now()` start there and
// keep ticking, so relative labels ("Tomorrow", "in 2 days", today's calendar square) read the same
// on every run while timers and waits still see time pass. Dates built from parts or a string are
// untouched. preview.tsx sets it before each story that asks and puts the real Date back after.

export function fixNow(iso: string): () => void {
  const RealDate = Date;
  const offset = RealDate.parse(iso) - RealDate.now();
  const now = () => RealDate.now() + offset;

  class FixedDate extends RealDate {
    constructor(...args: unknown[]) {
      // @ts-expect-error -- Date's overloads take 0, 1 or 2–7 arguments; these pass through as given.
      super(...(args.length === 0 ? [now()] : args));
    }
    static override now() {
      return now();
    }
  }

  globalThis.Date = FixedDate as DateConstructor;
  return () => {
    globalThis.Date = RealDate;
  };
}
