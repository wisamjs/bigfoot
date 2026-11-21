import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Marks a Sample Application (GLOSSARY.md). Says "Sample" in text, so it never relies on colour,
 * and stays on the Application after the job seeker edits it.
 */
export function SampleBadge() {
  return (
    <span title="Bigfoot added this to show how it works. Edit or delete it any time." className="inline-flex">
      <Badge tone="neutral">
        <Sparkles className="size-3" aria-hidden />
        Sample
      </Badge>
    </span>
  );
}
