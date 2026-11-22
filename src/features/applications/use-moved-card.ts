"use client";

import { useEffect, useRef, useState } from "react";
import { changeMessage, type StatusChange } from "@/features/applications/change-status-menu";
import type { Application } from "@/lib/applications";

/** Whether the Application has the Status and Outcome a change set. */
function hasChange(app: Application, change: StatusChange) {
  return app.status === change.status && (app.outcome ?? null) === change.outcome;
}

/** Done Applications other than Offers are only in the list while "Show done" is on. */
function leavesList(change: StatusChange, showDone: boolean) {
  return !showDone && change.status === "done" && change.outcome !== "offer";
}

/**
 * What the Applications list does after a card's Change Status menu saves: says so ("Acme marked
 * Rejected"), and once the saved change reaches `applications` and the card is in its new group,
 * focuses it, so keyboard and screen reader users aren't left on a button that no longer exists. A
 * card that left the list (Done, with "Show done" off) hands focus to the first card that's left.
 * Put `listRef` on the element holding the cards, each marked `data-application-id`.
 */
export function useMovedCard(applications: Application[], showDone: boolean) {
  const listRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef<{ id: string; change: StatusChange } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const moved = movedRef.current;
    const app = moved && applications.find((a) => a.id === moved.id);
    if (!moved || !app || !hasChange(app, moved.change)) return;
    movedRef.current = null;
    const cards = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-application-id]") ?? []);
    const card = cards.find((el) => el.dataset.applicationId === moved.id) ?? cards[0];
    card?.querySelector("a")?.focus();
    // `announcement` reruns this once the change is known, in case `applications` got there first.
  }, [applications, announcement]);

  function onChanged(app: Application, change: StatusChange) {
    movedRef.current = { id: app.id, change };
    const hint = leavesList(change, showDone) ? ". Turn on Show done to see it." : "";
    setAnnouncement(`${changeMessage(app, change)}${hint}`);
  }

  return { listRef, announcement, onChanged };
}
