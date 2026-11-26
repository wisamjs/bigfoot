"use client";

import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { PASSCODE_MAX_LENGTH, PASSCODE_MIN_LENGTH } from "@/lib/account";
import { suggestPasscode } from "@/lib/share-links";

/**
 * A Share link's Passcode (GLOSSARY.md): masked until Show, with Suggest, which fills in one easy to
 * say out loud and shows it. Uncontrolled, named `passcode`, so its form reads it and resets it.
 */
export function PasscodeField({
  id,
  error,
  onEdit,
  label = "Passcode",
}: {
  id: string;
  error?: string;
  /** Called when the job seeker types or suggests, so a stale error can go. */
  onEdit?: () => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  const hintId = `${id}-hint`;
  const invalid = invalidProps(`${id}-error`, error);

  function suggest() {
    const input = inputRef.current;
    if (!input) return;
    input.value = suggestPasscode();
    setShown(true);
    onEdit?.();
    input.focus();
  }

  return (
    <Field id={id} label={label} required error={error}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            name="passcode"
            type={shown ? "text" : "password"}
            required
            minLength={PASSCODE_MIN_LENGTH}
            maxLength={PASSCODE_MAX_LENGTH}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={`At least ${PASSCODE_MIN_LENGTH} characters`}
            onChange={onEdit}
            {...invalid}
            aria-describedby={[hintId, invalid["aria-describedby"]].filter(Boolean).join(" ")}
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
        <Button variant="secondary" onClick={suggest} className="shrink-0">
          <Sparkles className="size-4" aria-hidden />
          Suggest
        </Button>
      </div>
      <p id={hintId} className="m-0 mt-1 text-sm leading-[1.6] text-body">
        Easy to say out loud, like maple-river-otter-42.
      </p>
    </Field>
  );
}
