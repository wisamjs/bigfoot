"use client";

import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { openJourneyAction, type PasscodeState } from "@/app/s/[id]/actions";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { fieldLabelClasses } from "@/components/ui/field";
import { inputClasses } from "@/components/ui/input";
import { ShareLinkFrame } from "@/features/journey/share-link-frame";
import { initials } from "@/features/shell/avatar";
import { LOCKED_MESSAGE, viewerCopy } from "@/lib/journey";

const IDLE: PasscodeState = { status: "idle" };

/** What a try that didn't open the Journey says under the field. */
const ERRORS: Partial<Record<PasscodeState["status"], (copy: ReturnType<typeof viewerCopy>) => string>> = {
  wrong: (copy) => copy.wrongPasscode,
  error: () => "Couldn’t reach Bigfoot’s server. Try again.",
};

/**
 * A Share link's Passcode page (BIG-197): who shared it, the Passcode field with Show, and the
 * button that opens their Journey. A wrong Passcode says so under the field; 5 wrong ones in 15
 * minutes lock the link (`locked` on load, or the 5th try), and the button stays disabled.
 */
export function PasscodeForm({ id, sharedBy, locked = false }: { id: string; sharedBy: string | null; locked?: boolean }) {
  const copy = viewerCopy(sharedBy);
  const [state, submit, pending] = useActionState(openJourneyAction.bind(null, id), IDLE);
  const [shown, setShown] = useState(false);
  const isLocked = locked || state.status === "locked";
  const error = isLocked ? LOCKED_MESSAGE : ERRORS[state.status]?.(copy);
  const invalid = invalidProps("passcode-error", error);

  return (
    <ShareLinkFrame>
      <span
        aria-hidden
        className="grid size-[72px] place-items-center rounded-full border-2 border-line-brand bg-brand-soft text-2xl font-bold text-fg-brand-strong"
      >
        {sharedBy ? initials(sharedBy) : "?"}
      </span>
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] text-heading">{copy.invitation}</h1>
      <p className="m-0 mt-3 text-base leading-[1.7] text-body">{copy.intro}</p>
      <form action={submit} className="mt-6 flex w-full flex-col gap-4 text-left">
        <div>
          <label htmlFor="passcode" className={fieldLabelClasses}>
            Passcode
          </label>
          <div className="relative">
            <input
              id="passcode"
              name="passcode"
              type={shown ? "text" : "password"}
              required
              maxLength={128}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={isLocked}
              {...invalid}
              className={`${inputClasses} pr-12 font-mono`}
            />
            <button
              type="button"
              onClick={() => setShown(!shown)}
              aria-pressed={shown}
              aria-label="Show passcode"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-body transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-brand"
            >
              {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          {error && (
            <p id="passcode-error" role="alert" className="m-0 mt-2 flex items-start gap-2 text-sm text-fg-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={isLocked} aria-disabled={pending || undefined} className="w-full">
          {copy.open}
        </Button>
      </form>
      <p className="m-0 mt-5 text-sm text-body">{copy.askForPasscode}</p>
    </ShareLinkFrame>
  );
}
