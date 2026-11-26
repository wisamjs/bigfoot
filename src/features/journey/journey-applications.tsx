import { Badge, type Tone } from "@/components/ui/badge";
import { COMPLETED_MARK } from "@/features/applications/status-tone";
import { calendarDaysBetween, parseDay, relativeDays } from "@/lib/applications";
import {
  interviewsDone,
  journeyGroups,
  waitingDays,
  type JourneyApplication,
  type JourneyGroup,
} from "@/lib/journey";

const GROUP_TONE: Record<JourneyGroup["id"], Tone> = { offer: "success", interviewing: "blue", waiting: "warning" };
const appliedFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayTimeFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

const cell = "px-4 py-4 align-middle sm:px-6";

/**
 * Where things stand (BIG-197): the Journey's Applications grouped Got an Offer, Interviewing and
 * Waiting to hear back. Each row has the company and role, Progress (its group as a badge, with
 * "Waiting · 13 days", and a mark per Interview) and Next. On a phone each row stacks into one
 * column. Rendered in the browser only (JourneyView), so `now` is the Viewer's.
 */
export function JourneyApplications({ applications, now }: { applications: JourneyApplication[]; now: Date }) {
  const groups = journeyGroups(applications);
  return (
    <section aria-labelledby="journey-where-title" className="card flex min-w-0 flex-col overflow-hidden border-line-card">
      <h2 id="journey-where-title" className="m-0 px-4 py-5 text-xl font-bold leading-[1.25] text-heading sm:px-6">
        Where things stand
      </h2>
      {groups.length === 0 ? (
        <p className="m-0 px-4 pb-6 text-body sm:px-6">No Applications in progress right now.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead className="max-sm:sr-only">
            <tr className="bg-card-strong text-xs font-semibold uppercase tracking-[0.08em] text-body">
              <th scope="col" className={`${cell} py-3 sm:w-[40%]`}>
                Company
              </th>
              <th scope="col" className={`${cell} py-3 max-sm:hidden`}>
                Progress
              </th>
              <th scope="col" className={`${cell} py-3 max-sm:hidden`}>
                Next
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.id}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={3}
                  className={`${cell} border-t border-line pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-body`}
                >
                  {group.label}
                </th>
              </tr>
              {group.applications.map((app) => (
                <Row
                  key={`${app.company}|${app.title}|${app.applied_on}`}
                  app={app}
                  group={group.id}
                  now={now}
                  first={app === group.applications[0]}
                />
              ))}
            </tbody>
          ))}
        </table>
      )}
    </section>
  );
}

function Row({ app, group, now, first }: { app: JourneyApplication; group: JourneyGroup["id"]; now: Date; first: boolean }) {
  const border = first ? "" : "border-t border-line";
  return (
    <tr>
      <td className={`${cell} ${border}`}>
        <p className="m-0 font-semibold text-heading">{app.company}</p>
        <p className="m-0 text-sm text-body">{app.title}</p>
        <div className="mt-3 flex flex-col gap-2 sm:hidden">
          <Progress app={app} group={group} now={now} />
          <Next app={app} now={now} />
        </div>
      </td>
      <td className={`${cell} ${border} max-sm:hidden`}>
        <Progress app={app} group={group} now={now} />
      </td>
      <td className={`${cell} ${border} max-sm:hidden`}>
        <Next app={app} now={now} />
      </td>
    </tr>
  );
}

/** The group as a badge, then a mark per Interview with "2 of 4 done", or "Applied Nov 18" before any. */
function Progress({ app, group, now }: { app: JourneyApplication; group: JourneyGroup["id"]; now: Date }) {
  const done = interviewsDone(app);
  const next = app.offer ? -1 : app.interviews.findIndex((i) => !i.completed);
  return (
    <div className="flex flex-col items-start gap-2">
      <Badge tone={GROUP_TONE[group]} pill dot nowrap>
        {progressLabel(app, group, now)}
      </Badge>
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body">
        {app.interviews.length > 0 && (
          <span aria-hidden className="flex items-center gap-1">
            {app.interviews.map((interview, i) => (
              <span
                key={`${interview.at}|${interview.title}`}
                className={`h-1.5 w-6 rounded-full ${markClasses(interview.completed, i === next)}`}
              />
            ))}
          </span>
        )}
        <span>{done ?? `Applied ${appliedFormat.format(parseDay(app.applied_on))}`}</span>
      </p>
    </div>
  );
}

/** "Offer", "Interviewing", or "Waiting · 13 days". */
function progressLabel(app: JourneyApplication, group: JourneyGroup["id"], now: Date) {
  if (group === "offer") return "Offer";
  if (group === "interviewing") return "Interviewing";
  const days = waitingDays(app, now);
  return days === null ? "Waiting" : `Waiting · ${days} ${days === 1 ? "day" : "days"}`;
}

/** The colour of an Interview's mark: completed green, the next in the brand colour, later ones muted. */
function markClasses(completed: boolean, next: boolean) {
  if (completed) return COMPLETED_MARK.in_progress;
  return next ? "bg-brand" : "bg-line-medium";
}

/** What comes next: the next Interview's title and when, "Thinking it over" for an Offer, or "Nothing booked yet". */
function Next({ app, now }: { app: JourneyApplication; now: Date }) {
  if (app.offer) return <p className="m-0 font-semibold text-fg-success-strong">Thinking it over</p>;
  const next = app.interviews.find((i) => !i.completed);
  if (!next) return <p className="m-0 text-body">Nothing booked yet</p>;
  const at = new Date(next.at);
  const days = calendarDaysBetween(now, at);
  const soon = days <= 1;
  const when = soon
    ? `${relativeDays(days).replace(/^./, (c) => c.toUpperCase())}, ${timeFormat.format(at)}`
    : days < 7
      ? weekdayTimeFormat.format(at)
      : dateFormat.format(at);
  return (
    <p className={`m-0 font-semibold ${soon ? "text-fg-brand" : "text-heading"}`}>
      {next.title} · <time dateTime={next.at}>{when}</time>
    </p>
  );
}
