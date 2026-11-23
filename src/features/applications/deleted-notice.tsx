"use client";

import { CircleCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DELETED_PARAM } from "@/features/applications/routes";

/**
 * "Interview deleted", once an Application page opens after one of its Interviews was deleted from
 * its own page (interviewDeletedHref). The status line is on the page from the start, empty, so screen readers
 * announce the text when it arrives. The search param then goes, so a refresh or a shared link
 * doesn't say it again.
 */
export function DeletedNotice() {
  const deleted = useSearchParams().get(DELETED_PARAM);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (deleted !== "interview") return;
    // After mount, so the live region exists before its text changes.
    const frame = requestAnimationFrame(() => {
      setMessage("Interview deleted");
      const url = new URL(window.location.href);
      url.searchParams.delete(DELETED_PARAM);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    });
    return () => cancelAnimationFrame(frame);
  }, [deleted]);

  return (
    <output
      className={
        message
          ? "flex items-center gap-2 rounded-card border border-line-success-subtle bg-success-soft p-4 text-sm font-medium text-fg-success-strong"
          : "sr-only"
      }
    >
      {message && <CircleCheck className="size-4 shrink-0" aria-hidden />}
      {message}
    </output>
  );
}
