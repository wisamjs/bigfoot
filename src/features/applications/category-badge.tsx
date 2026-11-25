import { Badge } from "@/components/ui/badge";
import { CATEGORY_TONE } from "@/features/applications/status-tone";
import { categoryLabel, type InterviewCategory } from "@/lib/applications";

/**
 * An Interview's category as a tag beside its title (GLOSSARY.md, Interview category). It says the
 * category in text, so it never relies on colour.
 */
export function CategoryBadge({ category }: { category: InterviewCategory }) {
  return <Badge tone={CATEGORY_TONE[category]}>{categoryLabel(category)}</Badge>;
}
