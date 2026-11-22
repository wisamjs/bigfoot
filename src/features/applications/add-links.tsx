import { BriefcasePlus, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { ADD_APPLICATION_HREF, addInterviewHref } from "@/features/applications/routes";

/** The dashboard's Add Application button: a link to the page that adds one. */
export function AddApplicationLink() {
  return (
    <Link href={ADD_APPLICATION_HREF} className={buttonClasses("brand")}>
      <BriefcasePlus className="size-4" aria-hidden />
      Add Application
    </Link>
  );
}

/** The dashboard's Add Interview button: a link to the page that adds one, Application not yet chosen. */
export function AddInterviewLink() {
  return (
    <Link href={addInterviewHref()} className={buttonClasses("secondary")}>
      <CalendarPlus className="size-4" aria-hidden />
      Add Interview
    </Link>
  );
}
