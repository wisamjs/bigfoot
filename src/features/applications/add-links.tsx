import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { ADD_APPLICATION_HREF, addInterviewHref } from "@/features/applications/routes";

/** The Applications card's Add Application button: a link to the page that adds one. */
export function AddApplicationLink({ children = "Add Application" }: { children?: string }) {
  return (
    <Link href={ADD_APPLICATION_HREF} className={buttonClasses("brand")}>
      <Plus className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/** The Interviews card's Add Interview button: a link to the page that adds one, Application not yet chosen. */
export function AddInterviewLink() {
  return (
    <Link href={addInterviewHref()} className={buttonClasses("secondary")}>
      <Plus className="size-4" aria-hidden />
      Add Interview
    </Link>
  );
}
