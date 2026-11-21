"use client";

import { useActionState, useId, useState } from "react";
import { deleteAccountAction } from "@/app/account/actions";
import { inputClasses } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { DELETE_CONFIRMATION } from "@/lib/account";

/** Type DELETE, then delete: the button stays disabled until the word matches. */
export function DeleteAccountForm() {
  const [state, action, isPending] = useActionState(deleteAccountAction, { error: null });
  const [confirmation, setConfirmation] = useState("");
  const inputId = useId();
  const hintId = useId();
  const confirmed = confirmation.trim() === DELETE_CONFIRMATION;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-heading">
          Type {DELETE_CONFIRMATION} to confirm
        </label>
        <input
          id={inputId}
          name="confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={hintId}
          className={`${inputClasses} max-w-xs`}
        />
        <p id={hintId} className="m-0 mt-2 text-sm leading-[1.6] text-body">
          This can’t be undone.
        </p>
      </div>
      {state.error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={!confirmed || isPending} variant="danger">
          {isPending ? "Deleting your account…" : "Delete my account"}
        </Button>
      </div>
    </form>
  );
}
