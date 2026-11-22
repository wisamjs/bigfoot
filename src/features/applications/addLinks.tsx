import { BriefcasePlus, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { ADD_APPLICATION_HREF, addInterviewHref } from "@/features/applications/routes";

/** The Applications section's Add Application button: a link to the page that adds one. */
export function AddApplicationLink() {
  return (
    <Link href={ADD_APPLICATION_HREF} className={buttonClasses("brand")}>
      <BriefcasePlus className="size-4" aria-hidden />
      Add Application
    </Link>
  );
}

/** The Interviews section's Add Interview button: a link to the page that adds one, Application not yet chosen. */
export function AddInterviewLink() {
  return (
    <Link href={addInterviewHref()} className={buttonClasses("brand")}>
      <CalendarPlus className="size-4" aria-hidden />
      Add Interview
    </Link>
  );
}
