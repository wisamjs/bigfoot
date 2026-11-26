"use client";

import { Check, CircleCheck, Copy, EyeOff, Info, Link2, Plus } from "lucide-react";
import { useActionState, useId, useState, useTransition, type ReactNode } from "react";
import {
  changePasscodeAction,
  createShareLinkAction,
  renewShareLinkAction,
  stopSharingAction,
  type CreateShareLinkState,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useIsClient } from "@/hooks/use-is-client";
import { useToday } from "@/hooks/use-today";
import { SHARE_LINK_LABEL_MAX, SHARE_LINKS_MAX } from "@/lib/account";
import type { NewShareLink, ShareLink } from "@/lib/api";
import { expiry, followingText, lastOpened, shareLinkPath, shortDate } from "@/lib/share-links";
import { passcodeError, shareLinkLabelError } from "@/lib/validation";
import { PasscodeField } from "./passcode-field";

const THEY_SEE = [
  "Interview dates and times in their own time zone",
  "Companies, roles and where each one stands",
  "Interview titles as you wrote them",
  "Offers",
];
const STAYS_PRIVATE = [
  "Your Prep notes and Interview notes",
  "Salary and job links",
  "Applications that ended without an Offer",
];

/** The link a Viewer opens. The browser knows the site's address; the server render shows the path. */
function useShareUrl() {
  const isClient = useIsClient();
  return (id: string) => (isClient ? `${window.location.origin}${shareLinkPath(id)}` : shareLinkPath(id));
}

/**
 * The Account page's Share links (GLOSSARY.md): create one with its Passcode, copy both from the
 * Link ready dialog, and copy, renew, change the Passcode of or stop sharing each one.
 */
export function ShareLinks({ links }: { links: ShareLink[] }) {
  const [state, create, isCreating] = useActionState(createShareLinkAction, { error: null, created: null });
  // The id of a created link whose Link ready dialog the job seeker has closed.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<ShareLink | null>(null);
  const [stopping, setStopping] = useState<ShareLink | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const ready = state.created && state.created.id !== dismissed ? state.created : null;
  const url = useShareUrl();
  const full = links.length >= SHARE_LINKS_MAX;

  return (
    <div className="flex flex-col gap-6">
      {links.length === 0 ? (
        <>
          <p className="m-0 text-base leading-[1.7] text-body">
            Make a private link so family can follow along: when your Interviews are and how each Application is
            going. Opening it takes the link and a passcode you choose, and it can’t change anything.
          </p>
          <WhatTheySee />
          <CreateLinkForm heading="Create your first link" state={state} create={create} isCreating={isCreating} />
        </>
      ) : (
        <>
          <p className="m-0 text-base leading-[1.7] text-body">{followingText(links)}</p>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {links.map((link) => (
              <ShareLinkCard
                key={link.id}
                link={link}
                url={url(link.id)}
                onChangePasscode={() => setChanging(link)}
                onStop={() => setStopping(link)}
                onRenewed={(renewed) => setAnnouncement(`Renewed the link for ${renewed.label}.`)}
              />
            ))}
          </ul>
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            {full ? (
              <p className="m-0 text-sm leading-[1.6] text-body">
                You can share with up to {SHARE_LINKS_MAX} people. Stop sharing one to add another.
              </p>
            ) : (
              <AddLink adding={adding} onToggle={() => setAdding(!adding)}>
                <CreateLinkForm heading="Someone new" state={state} create={create} isCreating={isCreating} />
              </AddLink>
            )}
          </div>
        </>
      )}
      <output className="sr-only">{announcement}</output>

      <Modal
        open={ready !== null}
        onClose={() => {
          setDismissed(ready?.id ?? null);
          setAdding(false);
        }}
        title={ready ? `Link ready for ${ready.label}` : "Link ready"}
      >
        {ready && (
          <PasscodeShown
            link={ready}
            url={url(ready.id)}
            intro="Send the link and the passcode separately."
            onDone={() => {
              setDismissed(ready.id);
              setAdding(false);
            }}
          />
        )}
      </Modal>

      <ChangePasscodeDialog link={changing} url={changing ? url(changing.id) : ""} onClose={() => setChanging(null)} />

      <Modal
        open={stopping !== null}
        onClose={() => setStopping(null)}
        title={stopping ? `Stop sharing with ${stopping.label}?` : "Stop sharing"}
      >
        {stopping && (
          <StopSharingConfirmation
            link={stopping}
            onCancel={() => setStopping(null)}
            onStopped={() => {
              setAnnouncement(`Stopped sharing with ${stopping.label}.`);
              setStopping(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/** "+ Share with someone else", which opens the create form under it. */
function AddLink({ adding, onToggle, children }: { adding: boolean; onToggle: () => void; children: ReactNode }) {
  const formId = useId();
  return (
    <>
      <div className="-mx-2">
        <Button variant="tertiary" onClick={onToggle} aria-expanded={adding} aria-controls={formId}>
          <Plus className="size-4" aria-hidden />
          Share with someone else
        </Button>
      </div>
      <div id={formId} hidden={!adding}>
        {adding && children}
      </div>
    </>
  );
}

/** What a Viewer sees and what stays private, side by side, or stacked on a phone. */
function WhatTheySee() {
  return (
    <div className="grid gap-6 rounded-card border border-line bg-surface p-4 text-sm leading-[1.6] text-heading sm:grid-cols-2">
      <div>
        <h3 className="m-0 mb-3 text-sm font-medium">They’ll see</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {THEY_SEE.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-fg-success-strong" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="m-0 mb-3 text-sm font-medium">Stays private</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {STAYS_PRIVATE.map((item) => (
            <li key={item} className="flex gap-2">
              <EyeOff className="mt-1 size-4 shrink-0 text-body" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreateLinkForm({
  heading,
  state,
  create,
  isCreating,
}: {
  heading: string;
  state: CreateShareLinkState;
  create: (payload: FormData) => void;
  isCreating: boolean;
}) {
  const id = useId();
  const labelId = `${id}-label-input`;
  const hintId = `${id}-label-hint`;
  // Found before sending; the Server Action's own checks come back in state.
  const [clientErrors, setClientErrors] = useState<{ label?: string; passcode?: string } | null>(null);
  // The state the job seeker has edited since: its field errors are out of date.
  const [editedState, setEditedState] = useState<CreateShareLinkState | null>(null);
  const serverErrors = editedState === state ? {} : { label: state.labelError, passcode: state.passcodeError };
  const errors = clientErrors ?? serverErrors;
  const labelInvalid = invalidProps(`${labelId}-error`, errors.label ?? undefined);

  function edited() {
    setClientErrors(null);
    setEditedState(state);
  }

  return (
    <form
      action={create}
      // The submit button is only aria-disabled while creating, so it keeps focus; refuse a second submit here.
      // noValidate: errors show beside their fields in Bigfoot's words, not as browser bubbles.
      noValidate
      onSubmit={(e) => {
        if (isCreating) return e.preventDefault();
        const form = e.currentTarget;
        const label = (form.elements.namedItem("label") as HTMLInputElement).value;
        const passcode = (form.elements.namedItem("passcode") as HTMLInputElement).value;
        const found = { label: shareLinkLabelError(label) ?? undefined, passcode: passcodeError(passcode) ?? undefined };
        const invalid = Boolean(found.label || found.passcode);
        setClientErrors(invalid ? found : null);
        if (invalid) {
          e.preventDefault();
          (form.elements.namedItem(found.label ? "label" : "passcode") as HTMLInputElement).focus();
        }
      }}
      className="flex flex-col gap-4"
    >
      <h3 className="m-0 text-base font-medium leading-[1.25] text-heading">{heading}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={labelId} label="Who it’s for" required error={errors.label ?? undefined}>
          <input
            id={labelId}
            name="label"
            required
            maxLength={SHARE_LINK_LABEL_MAX}
            autoComplete="off"
            placeholder="e.g. Mom & Dad"
            onChange={edited}
            {...labelInvalid}
            aria-describedby={[hintId, labelInvalid["aria-describedby"]].filter(Boolean).join(" ")}
            className={inputClasses}
          />
          <p id={hintId} className="m-0 mt-1 text-sm leading-[1.6] text-body">
            Only you see this, so you can tell links apart.
          </p>
        </Field>
        <PasscodeField id={`${id}-passcode`} error={errors.passcode ?? undefined} onEdit={edited} />
      </div>
      {state.error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" aria-disabled={isCreating || undefined}>
          <Link2 className="size-4" aria-hidden />
          {isCreating ? "Creating…" : "Create link"}
        </Button>
      </div>
    </form>
  );
}

function ShareLinkCard({
  link,
  url,
  onChangePasscode,
  onStop,
  onRenewed,
}: {
  link: ShareLink;
  url: string;
  onChangePasscode: () => void;
  onStop: () => void;
  onRenewed: (link: ShareLink) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isRenewing, startRenew] = useTransition();

  function renew() {
    setError(null);
    startRenew(async () => {
      const result = await renewShareLinkAction(link.id);
      if (result.ok) onRenewed(result.link);
      else setError(result.error);
    });
  }

  return (
    <li
      className={`flex flex-col gap-4 rounded-card border p-4 ${
        link.expired ? "border-dashed border-line-medium bg-surface-white" : "border-line bg-surface"
      }`}
    >
      <ShareLinkFacts link={link} />
      <CopyField label={`Link for ${link.label}`} hideLabel value={url} copyText="Copy link" />
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="-mx-2 flex flex-wrap gap-x-1">
        <Button variant="tertiary" size="sm" onClick={onChangePasscode} aria-label={`Change passcode for ${link.label}`}>
          Change passcode
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          onClick={renew}
          aria-disabled={isRenewing || undefined}
          aria-label={`Renew the link for ${link.label}`}
        >
          {isRenewing ? "Renewing…" : "Renew"}
        </Button>
        <Button variant="tertiary" size="sm" onClick={onStop} aria-label={`Stop sharing with ${link.label}`}>
          Stop sharing
        </Button>
      </div>
    </li>
  );
}

/** Who it's for, its dates, when it was last opened and when it expires; dates once the browser's time zone is known. */
function ShareLinkFacts({ link }: { link: ShareLink }) {
  const now = useToday();
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className={`m-0 break-words text-base font-medium ${link.expired ? "text-body" : "text-heading"}`}>
          {link.label}
        </h3>
        <p className="m-0 min-h-[1.6em] text-sm leading-[1.6] text-body">
          {now && `Created ${shortDate(link.created_at)} · Passcode set ${shortDate(link.passcode_set_at)}`}
        </p>
      </div>
      {now && <ShareLinkStatus link={link} now={now} />}
    </div>
  );
}

function ShareLinkStatus({ link, now }: { link: ShareLink; now: Date }) {
  const ends = expiry(link, now);
  return (
    <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
      <p className={`m-0 ${link.last_opened_at ? "font-medium text-fg-success-strong" : "text-body"}`}>
        {lastOpened(link, now)}
      </p>
      <p className={`m-0 ${EXPIRY_TONE[ends.tone]}`}>{ends.text}</p>
    </div>
  );
}

const EXPIRY_TONE = {
  normal: "text-body",
  soon: "font-medium text-fg-warning",
  expired: "font-medium text-heading",
} as const;

/** A value to hand on, read-only, with a Copy button that says when it worked. */
function CopyField({
  label,
  value,
  copyText = "Copy",
  hideLabel = false,
  brand = false,
}: {
  label: string;
  value: string;
  copyText?: string;
  hideLabel?: boolean;
  brand?: boolean;
}) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the value is on screen to select by hand.
    }
  }

  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-2 block text-sm font-medium text-heading"}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClasses} min-w-0 flex-1 font-mono`}
        />
        <Button
          variant={brand && !copied ? "brand" : "secondary"}
          onClick={copy}
          aria-label={`${copied ? "Copied" : copyText}: ${label}`}
          className={`shrink-0 ${copied ? "border-line-success-subtle text-fg-success-strong" : ""}`}
        >
          <CopyLabel copied={copied} text={copyText} />
        </Button>
      </div>
    </div>
  );
}

function CopyLabel({ copied, text }: { copied: boolean; text: string }) {
  if (!copied) {
    return (
      <>
        <Copy className="size-4" aria-hidden />
        {text}
      </>
    );
  }
  return (
    <>
      <Check className="size-4" aria-hidden />
      Copied
    </>
  );
}

/** The one time a Passcode is shown (alerts.md, success): the link and the Passcode to copy, then Done. */
function PasscodeShown({
  link,
  url,
  intro,
  onDone,
}: {
  link: NewShareLink;
  url: string;
  intro: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 pt-6">
      <p className="m-0 flex items-center gap-2 text-base leading-[1.6] text-body">
        <CircleCheck className="size-5 shrink-0 text-fg-success-strong" aria-hidden />
        {intro}
      </p>
      <CopyField label="Link" value={url} copyText="Copy link" brand />
      <CopyField label="Passcode" value={link.passcode} copyText="Copy" />
      <Notice title="You’ll only see this passcode now.">
        Send it in a different message from the link, or say it on the phone. Lost it? Choose Change passcode on the
        link.
      </Notice>
      <div className="flex justify-end border-t border-line pt-4">
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-card border border-line-brand-subtle bg-brand-softer p-4 text-sm leading-[1.6] text-fg-brand-strong">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="m-0 font-medium">{title}</p>
        <p className="m-0">{children}</p>
      </div>
    </div>
  );
}

/** Change passcode: the Passcode field, then the new Passcode, shown once, like the Link ready dialog. */
function ChangePasscodeDialog({ link, url, onClose }: { link: ShareLink | null; url: string; onClose: () => void }) {
  const [changed, setChanged] = useState<NewShareLink | null>(null);
  const close = () => {
    setChanged(null);
    onClose();
  };
  const title = link ? `${changed ? "New passcode" : "Change passcode"} for ${link.label}` : "Change passcode";
  return (
    <Modal open={link !== null} onClose={close} title={title}>
      {link &&
        (changed ? (
          <PasscodeShown link={changed} url={url} intro="The link stays the same." onDone={close} />
        ) : (
          <ChangePasscodeForm link={link} onCancel={close} onChanged={setChanged} />
        ))}
    </Modal>
  );
}

function ChangePasscodeForm({
  link,
  onCancel,
  onChanged,
}: {
  link: ShareLink;
  onCancel: () => void;
  onChanged: (link: NewShareLink) => void;
}) {
  const id = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (isPending) return;
        const input = e.currentTarget.elements.namedItem("passcode") as HTMLInputElement;
        const problem = passcodeError(input.value);
        setFieldError(problem);
        if (problem) return input.focus();
        setError(null);
        startTransition(async () => {
          const result = await changePasscodeAction(link.id, input.value);
          if (result.ok) onChanged(result.link);
          else setError(result.error);
        });
      }}
      className="flex flex-col gap-4 pt-6"
    >
      <p className="m-0 text-base leading-[1.625] text-body">
        Anyone viewing this link is signed out and needs the new passcode to open it again. The link stays the same.
      </p>
      <PasscodeField id={`${id}-passcode`} label="New passcode" error={fieldError ?? undefined} onEdit={() => setFieldError(null)} />
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" aria-disabled={isPending || undefined}>
          {isPending ? "Saving…" : "Save passcode"}
        </Button>
      </div>
    </form>
  );
}

function StopSharingConfirmation({
  link,
  onCancel,
  onStopped,
}: {
  link: ShareLink;
  onCancel: () => void;
  onStopped: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function stop() {
    startTransition(async () => {
      const result = await stopSharingAction(link.id);
      if (result.ok) onStopped();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">
        The link stops working straight away. You can’t undo this.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <Button
          onClick={onCancel}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the stop sharing dialog moves focus to its safe choice, Cancel, on purpose.
          autoFocus
          variant="secondary"
        >
          Cancel
        </Button>
        <Button onClick={stop} disabled={isPending} variant="danger">
          {isPending ? "Stopping…" : "Stop sharing"}
        </Button>
      </div>
    </div>
  );
}
