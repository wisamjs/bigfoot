"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useActionState, useId, useState, useTransition, type ReactNode } from "react";
import { createAccessTokenAction, revokeAccessTokenAction } from "@/app/account/actions";
import { Modal } from "@/components/modal";
import { Badge, buttonClasses, dangerButtonClasses, inputClasses } from "@/components/ui";
import { useIsClient } from "@/components/use-is-client";
import { ACCESS_TOKEN_NAME_MAX } from "@/lib/account";
import type { AccessToken, NewAccessToken } from "@/lib/api";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A date in the viewer's time zone, which the server doesn't know: rendered after hydration. */
function When({ at, time = false }: { at: string; time?: boolean }) {
  const isClient = useIsClient();
  if (!isClient) return <span className="inline-block h-4 w-20" />;
  return <time dateTime={at}>{(time ? dateTimeFormat : dateFormat).format(new Date(at))}</time>;
}

/**
 * The Account page's Access tokens (GLOSSARY.md): create one, copy its secret the one time it is
 * shown, see each token's dates, and revoke it. `apiUrl` is the address scripts call.
 */
export function AccessTokens({ tokens, apiUrl }: { tokens: AccessToken[]; apiUrl: string }) {
  const [state, create, isCreating] = useActionState(createAccessTokenAction, { error: null, created: null });
  // The id of a created token whose secret the job seeker has put away, or revoked.
  const [hidden, setHidden] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AccessToken | null>(null);
  const nameId = useId();
  const hintId = useId();
  const created = state.created && state.created.id !== hidden ? state.created : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Always mounted, so screen readers announce the new token when it appears. */}
      <div role="status">{created && <NewToken token={created} apiUrl={apiUrl} onDone={() => setHidden(created.id)} />}</div>

      {tokens.length === 0 ? (
        <p className="m-0 text-sm leading-[1.6] text-body">You have no Access tokens.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line bg-surface-white p-0">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex flex-col gap-3 border-t border-line p-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-medium text-heading">
                  <span className="min-w-0 break-words">{token.name}</span>
                  {token.expired && <Badge tone="warning">Expired</Badge>}
                </p>
                <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm leading-[1.6] text-body">
                  <Fact label="Created">
                    <When at={token.created_at} />
                  </Fact>
                  <Fact label="Last used">{token.last_used_at ? <When at={token.last_used_at} time /> : "Never"}</Fact>
                  <Fact label={token.expired ? "Expired" : "Expires"}>
                    <When at={token.expires_at} />
                  </Fact>
                </dl>
              </div>
              <button
                type="button"
                onClick={() => setRevoking(token)}
                aria-label={`Revoke ${token.name}`}
                className={`${buttonClasses("secondary", "sm")} self-start sm:self-auto`}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={create} className="flex flex-col gap-2">
        <label htmlFor={nameId} className="block text-sm font-medium text-heading">
          Name of a new Access token
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={nameId}
            name="name"
            required
            maxLength={ACCESS_TOKEN_NAME_MAX}
            autoComplete="off"
            aria-describedby={hintId}
            className={`${inputClasses} sm:max-w-xs`}
          />
          <button
            type="submit"
            disabled={isCreating}
            className={`${buttonClasses("brand", "md")} self-start disabled:opacity-60`}
          >
            <Plus className="size-4" aria-hidden />
            {isCreating ? "Creating…" : "Create Access token"}
          </button>
        </div>
        <p id={hintId} className="m-0 text-sm leading-[1.6] text-body">
          Say what it’s for, such as “Calendar cron job”, so you can tell your tokens apart.
        </p>
        {state.error && (
          <p role="alert" className="m-0 text-sm text-fg-danger">
            {state.error}
          </p>
        )}
      </form>

      <Modal open={revoking !== null} onClose={() => setRevoking(null)} title="Revoke Access token">
        {revoking && (
          <RevokeConfirmation
            token={revoking}
            onCancel={() => setRevoking(null)}
            onRevoked={() => {
              if (revoking.id === state.created?.id) setHidden(revoking.id);
              setRevoking(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt>{label}</dt>
      <dd className="m-0 text-heading">{children}</dd>
    </div>
  );
}

/** The one time a token's secret is shown (alerts.md, success): copy it, then put it away. */
function NewToken({ token, apiUrl, onDone }: { token: NewAccessToken; apiUrl: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the secret is on screen to select by hand.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line-success-subtle bg-success-soft p-4 text-sm leading-[1.6] text-fg-success-strong">
      <h3 className="m-0 text-base font-medium leading-[1.25]">Copy your Access token now</h3>
      <p className="m-0">
        This is the only time Bigfoot shows the secret for “{token.name}”. Keep it somewhere safe, such as a
        password manager. If you lose it, revoke the token and create another.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code
          className="min-w-0 flex-1 break-all rounded-control border border-line-success-subtle bg-surface-white px-3 py-2 font-mono text-sm text-heading"
        >
          {token.token}
        </code>
        <button type="button" onClick={copy} className={`${buttonClasses("secondary", "sm")} self-start sm:self-auto`}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="m-0">
        To try it, put the secret in <code className="font-mono">BIGFOOT_TOKEN</code> and list your Applications:
      </p>
      <code className="block wrap-anywhere rounded-control border border-line-success-subtle bg-surface-white px-3 py-2 font-mono text-sm text-heading">
        curl -H &quot;Authorization: Bearer $BIGFOOT_TOKEN&quot; {apiUrl}/applications
      </code>
      <div>
        <button type="button" onClick={onDone} className={buttonClasses("secondary", "sm")}>
          I’ve copied it
        </button>
      </div>
    </div>
  );
}

function RevokeConfirmation({
  token,
  onCancel,
  onRevoked,
}: {
  token: AccessToken;
  onCancel: () => void;
  onRevoked: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeAccessTokenAction(token.id);
      if (result.ok) onRevoked();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">
        <span className="break-words font-medium text-heading">{token.name}</span> will stop working straight away,
        and any script using it will be refused. This can’t be undone.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the revoke dialog moves focus to its safe choice, Cancel, on purpose. */}
        <button type="button" onClick={onCancel} autoFocus className={buttonClasses("secondary", "md")}>
          Cancel
        </button>
        <button type="button" onClick={revoke} disabled={isPending} className={dangerButtonClasses}>
          {isPending ? "Revoking…" : "Revoke"}
        </button>
      </div>
    </div>
  );
}
