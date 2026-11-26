import { Badge, type Tone } from "@/components/ui/badge";
import { journeyNext, markClasses, nextMarkIndex, progressLabel } from "@/features/journey/journey-text";
import { parseDay } from "@/lib/applications";
import { interviewsDone, journeyGroups, type JourneyApplication, type JourneyGroup } from "@/lib/journey";

const GROUP_TONE: Record<JourneyGroup["id"], Tone> = { offer: "success", interviewing: "blue", waiting: "warning" };
const appliedFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const cell = "px-4 py-4 align-middle sm:px-6";

/**
 * Where things stand (BIG-197): the Journey's Applications, Offers first, then Interviewing, then
 * Waiting to hear back. Each row has the company and role, Progress (its group as a badge, with
 * "Waiting · 13 days", and a mark per Interview) and Next. The badge names the group, so the groups
 * have no heading rows (BIG-208). On a phone each row stacks into one column. Rendered in the
 * browser only (JourneyView), so `now` is the Viewer's.
 */
export function JourneyApplications({ applications, now }: { applications: JourneyApplication[]; now: Date }) {
  const groups = journeyGroups(applications);
  return (
    <section aria-labelledby="journey-where-title" className="card flex min-w-0 flex-col overflow-hidden border-line-brand-subtle">
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
          <tbody>
            {groups.flatMap((group) =>
              group.applications.map((app) => (
                <Row
                  key={`${app.company}|${app.title}|${app.applied_on}`}
                  app={app}
                  group={group.id}
                  now={now}
                  first={app === groups[0].applications[0]}
                />
              )),
            )}
          </tbody>
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
  const next = nextMarkIndex(app);
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

/** What comes next: the next Interview's title and when, "Thinking it over" for an Offer, or "Nothing booked yet". */
function Next({ app, now }: { app: JourneyApplication; now: Date }) {
  const next = journeyNext(app, now);
  if (next.kind === "offer") return <p className="m-0 font-semibold text-fg-success-strong">Thinking it over</p>;
  if (next.kind === "nothing") return <p className="m-0 text-body">Nothing booked yet</p>;
  return (
    <p className={`m-0 font-semibold ${next.soon ? "text-fg-brand" : "text-heading"}`}>
      {next.title} · <time dateTime={next.at}>{next.when}</time>
    </p>
  );
}
