"use client";

import { useSaveStatus } from "@/hooks/use-save-status";
import { DetailsForm } from "@/features/applications/details-form";

/** The details of an Application that doesn't exist yet; adding it creates the Application. */
export function NewApplicationForm({ onDone }: { onDone: () => void }) {
  return <DetailsForm tracker={useSaveStatus()} onDone={onDone} />;
}
