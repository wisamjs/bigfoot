"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** What the job seeker was leaving by when the prompt stopped them. */
type Leaving =
  | { by: "link"; href: string }
  /** `steps` is how far in the history Back went, so Discard can go the same way. */
  | { by: "back"; steps: number };

type Registry = {
  /** Adds a source in tree order; `focus` moves focus to its first unsaved field. */
  register: (id: string, focus: () => void) => () => void;
  report: (id: string, unsaved: boolean) => void;
};

const UnsavedContext = createContext<Registry | null>(null);

/**
 * Tells the nearest `UnsavedChanges` whether this part of the page holds changes that aren't
 * saved (typed but not sent, still inside a typing pause, or a save that failed), and how to focus
 * its first unsaved field. Does nothing outside one, so a form works on its own in a test.
 */
export function useUnsavedChanges(unsaved: boolean, focus: () => void) {
  const registry = use(UnsavedContext);
  const id = useId();
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  });
  useEffect(() => registry?.register(id, () => focusRef.current()), [registry, id]);
  useEffect(() => {
    registry?.report(id, unsaved);
    return () => registry?.report(id, false);
  }, [registry, id, unsaved]);
}

/** The current history entry's position, where the browser says (Chromium's Navigation API). */
function historyIndex(): number | undefined {
  return (window as unknown as { navigation?: { currentEntry?: { index: number } } }).navigation?.currentEntry?.index;
}

/**
 * Guards a page against losing what's typed. While any part of it (see `useUnsavedChanges`) holds
 * unsaved changes, leaving by a link, by Back or by closing the tab doesn't happen straight away:
 * links and Back show "You have unsaved changes. Keep editing / Discard" above the page's content,
 * and closing or reloading the tab gets the browser's own prompt. Keep editing carries on at the
 * first unsaved field; Discard leaves. A save still on its way when the link is clicked (a field
 * blurs, and saves, as it's clicked) is waited for, and then the job seeker simply goes. With
 * nothing unsaved it does nothing at all.
 *
 * The prompt is part of the page, not a dialog, so it never stacks on another one.
 */
export function UnsavedChanges({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sourcesRef = useRef(new Map<string, { unsaved: boolean; focus: () => void }>());
  const [anyUnsaved, setAnyUnsaved] = useState(false);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  // The same as `leaving`, for what runs outside a render: a save landing.
  const leavingRef = useRef<Leaving | null>(null);
  const onSettledRef = useRef(() => {});
  const keepEditingRef = useRef(() => {});
  // Set while a Back that was stopped is being undone, and while a Discarded one goes through.
  const restoringRef = useRef(false);
  const discardingRef = useRef(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  /** Sets what's being left, in state for the prompt and in the ref for what runs outside a render. */
  function updateLeaving(next: Leaving | null) {
    leavingRef.current = next;
    setLeaving(next);
  }

  const registry = useMemo<Registry>(() => {
    const sync = () => {
      const unsaved = [...sourcesRef.current.values()].some((source) => source.unsaved);
      setAnyUnsaved(unsaved);
      if (!unsaved) onSettledRef.current();
    };
    return {
      register(id, focus) {
        sourcesRef.current.set(id, { unsaved: false, focus });
        return () => {
          sourcesRef.current.delete(id);
          sync();
        };
      },
      report(id, unsaved) {
        const source = sourcesRef.current.get(id);
        if (!source || source.unsaved === unsaved) return;
        source.unsaved = unsaved;
        sync();
      },
    };
  }, []);

  function leave(where: Leaving) {
    if (where.by === "link") router.push(where.href);
    else {
      discardingRef.current = true;
      window.history.go(where.steps);
    }
  }

  function keepEditing() {
    updateLeaving(null);
    // The first unsaved field, in page order, once the prompt has gone and the field is reachable.
    const first = [...sourcesRef.current.values()].find((source) => source.unsaved);
    requestAnimationFrame(() => first?.focus());
  }

  function discard() {
    if (!leaving) return;
    updateLeaving(null);
    leave(leaving);
  }

  useEffect(() => {
    if (!anyUnsaved) return;
    const index = historyIndex();

    // Closing or reloading the tab: the browser asks, in its own words.
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    // Links, any of them (the header, "← Dashboard", Add Interview): caught before Next.js's own
    // Link handler sees the click. New tabs, downloads and other sites are left alone.
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      updateLeaving({ by: "link", href: `${url.pathname}${url.search}${url.hash}` });
    };

    // Back (and Forward): the browser has already moved, and the page's own entry can't be kept
    // without adding to the history, so Next.js is kept from following it, and the browser goes
    // back to the page. Discard then makes the same move again, this time let through.
    const popState = (e: PopStateEvent) => {
      if (discardingRef.current) {
        discardingRef.current = false;
        return;
      }
      e.stopImmediatePropagation();
      if (restoringRef.current) {
        restoringRef.current = false;
        return;
      }
      const now = historyIndex();
      const steps = index !== undefined && now !== undefined && now !== index ? now - index : -1;
      restoringRef.current = true;
      window.history.go(-steps);
      updateLeaving({ by: "back", steps });
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    // Capturing, so it runs before Next.js's own listener and can keep it from navigating.
    window.addEventListener("popstate", popState, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popState, true);
    };
  }, [anyUnsaved]);

  // A link clicked right after typing blurs the field first, which starts its save. Once that
  // lands and nothing is unsaved, the job seeker goes where they were headed: there's nothing left to ask.
  useEffect(() => {
    keepEditingRef.current = keepEditing;
    onSettledRef.current = () => {
      const where = leavingRef.current;
      if (!where) return;
      updateLeaving(null);
      leave(where);
    };
  });

  // Screen readers hear the alert when it appears; focus goes to the safe choice. Escape in it is
  // Keep editing.
  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;
    keepRef.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      keepEditingRef.current();
    };
    prompt.addEventListener("keydown", escape);
    return () => prompt.removeEventListener("keydown", escape);
  }, [leaving]);

  return (
    <UnsavedContext value={registry}>
      {leaving && (
        // role="alert": announced as it appears. A page region, not a dialog.
        <div
          ref={promptRef}
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-card border border-line-warning-subtle bg-warning-soft p-4"
        >
          <p className="m-0 text-sm font-medium text-fg-warning">
            You have unsaved changes. Leaving now throws them away.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button ref={keepRef} size="sm" onClick={keepEditing}>
              Keep editing
            </Button>
            <Button size="sm" variant="danger" onClick={discard}>
              Discard
            </Button>
          </div>
        </div>
      )}
      {children}
    </UnsavedContext>
  );
}
