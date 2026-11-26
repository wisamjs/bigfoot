/**
 * Each typed field's placeholder: a realistic example of what goes in it, never a generic
 * "Type here…" (a rule for the UX guidelines, BIG-78). The label still says what the field is.
 */
export const PLACEHOLDERS = {
  company: "Northwind Labs",
  title: "Frontend Engineer",
  salary: "$150k–$180k",
  posting_url: "https://…",
  // What the company said when the Application ended (BIG-182).
  outcome_note: "They went with an internal candidate.",
  // Interview notes: the words of the BIG-179 designs.
  what_they_asked: "One question per line",
  how_it_went: "What landed, what didn't",
  takeaway: "One thing to do differently",
  prep_notes: "Review the caching chapter. Ask about the on-call rotation.",
  // A Participant's role (BIG-191). Their name has none: on someone known only by role, an example
  // name would read as theirs.
  participant_role: "Sr Director, Product",
} as const;
