// Proof-of-concept data. Every signed-in user sees this same pipeline.

export type Stage = "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";
export type Tone = "neutral" | "brand" | "success" | "warning";

export type Application = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  location: string;
  salary: string;
  source: string;
  appliedOn: string | null;
  nextStep: string;
  nextStepDate: string | null;
  status: { label: string; tone: Tone };
};

export const BOARD_STAGES: Stage[] = ["Saved", "Applied", "Interviewing", "Offer"];

export const applications: Application[] = [
  {
    id: "linear",
    company: "Linear",
    role: "Product Engineer",
    stage: "Saved",
    location: "Remote",
    salary: "$170k–$210k",
    source: "Company site",
    appliedOn: null,
    nextStep: "Tailor resume",
    nextStepDate: "Nov 12",
    status: { label: "Saved 2d ago", tone: "neutral" },
  },
  {
    id: "vercel",
    company: "Vercel",
    role: "Frontend Engineer",
    stage: "Saved",
    location: "Remote",
    salary: "$160k–$200k",
    source: "Referral",
    appliedOn: null,
    nextStep: "Ask Sam for referral",
    nextStepDate: "Nov 11",
    status: { label: "Saved today", tone: "neutral" },
  },
  {
    id: "stripe",
    company: "Stripe",
    role: "Software Engineer II",
    stage: "Applied",
    location: "Toronto",
    salary: "$180k–$220k",
    source: "LinkedIn",
    appliedOn: "Nov 3",
    nextStep: "Follow up with recruiter",
    nextStepDate: "Nov 13",
    status: { label: "Follow up Thu", tone: "warning" },
  },
  {
    id: "notion",
    company: "Notion",
    role: "Full-stack Engineer",
    stage: "Applied",
    location: "New York",
    salary: "$175k–$215k",
    source: "Greenhouse",
    appliedOn: "Nov 5",
    nextStep: "Wait for response",
    nextStepDate: null,
    status: { label: "Applied 5d ago", tone: "neutral" },
  },
  {
    id: "shopify",
    company: "Shopify",
    role: "Senior Developer",
    stage: "Applied",
    location: "Remote",
    salary: "$165k–$195k",
    source: "Company site",
    appliedOn: "Nov 7",
    nextStep: "Wait for response",
    nextStepDate: null,
    status: { label: "Applied 3d ago", tone: "neutral" },
  },
  {
    id: "figma",
    company: "Figma",
    role: "Senior Engineer",
    stage: "Interviewing",
    location: "San Francisco",
    salary: "$200k–$250k",
    source: "Referral",
    appliedOn: "Oct 21",
    nextStep: "Onsite loop",
    nextStepDate: "Nov 16",
    status: { label: "Onsite Mon 10:00", tone: "brand" },
  },
  {
    id: "datadog",
    company: "Datadog",
    role: "Software Engineer",
    stage: "Interviewing",
    location: "New York",
    salary: "$185k–$225k",
    source: "Recruiter",
    appliedOn: "Oct 28",
    nextStep: "Technical screen",
    nextStepDate: "Nov 12",
    status: { label: "Screen Wed 14:00", tone: "brand" },
  },
  {
    id: "ramp",
    company: "Ramp",
    role: "Staff Engineer",
    stage: "Offer",
    location: "New York",
    salary: "$240k + equity",
    source: "Recruiter",
    appliedOn: "Oct 2",
    nextStep: "Reply to offer",
    nextStepDate: "Nov 14",
    status: { label: "Reply by Fri", tone: "success" },
  },
  {
    id: "airbnb",
    company: "Airbnb",
    role: "Senior Engineer",
    stage: "Rejected",
    location: "Remote",
    salary: "$190k–$230k",
    source: "LinkedIn",
    appliedOn: "Oct 9",
    nextStep: "Ask for feedback",
    nextStepDate: null,
    status: { label: "Closed", tone: "neutral" },
  },
];

/** A smaller pipeline for the landing page preview. */
export const previewApplications = applications.filter((a) =>
  ["linear", "vercel", "stripe", "notion", "figma", "ramp"].includes(a.id),
);

export function getStats(apps: Application[]) {
  const submitted = apps.filter((a) => a.appliedOn !== null);
  const responded = submitted.filter((a) =>
    (["Interviewing", "Offer", "Rejected"] as Stage[]).includes(a.stage),
  );
  return {
    active: apps.filter((a) => a.stage !== "Rejected").length,
    interviewing: apps.filter((a) => a.stage === "Interviewing").length,
    responseRate: submitted.length ? Math.round((responded.length / submitted.length) * 100) : 0,
    offers: apps.filter((a) => a.stage === "Offer").length,
  };
}

export function getUpcoming(apps: Application[]) {
  return apps
    .filter((a): a is Application & { nextStepDate: string } => a.nextStepDate !== null)
    .sort((a, b) => Date.parse(`${a.nextStepDate} 2026`) - Date.parse(`${b.nextStepDate} 2026`));
}
