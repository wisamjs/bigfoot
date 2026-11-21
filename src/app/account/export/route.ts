import { getJobSeeker, listAccessTokens, listApplications } from "@/lib/api";
import { findCurrentUser } from "@/lib/dal";
import {
  applicationsCsv,
  dataExportJson,
  EXPORT_CONTENT_TYPES,
  exportFileName,
  isExportFormat,
} from "@/lib/data-export";

/**
 * GET /account/export?format=csv|json: downloads the signed-in job seeker's data. The session
 * names the job seeker; the API scopes every read to them (docs/adr/0001).
 */
export async function GET(request: Request) {
  const user = await findCurrentUser();
  if (!user) return Response.redirect(new URL("/", request.url), 303);

  const format = new URL(request.url).searchParams.get("format");
  if (!isExportFormat(format))
    return new Response("format must be csv or json", { status: 400 });

  const now = new Date();
  // JSON also needs the job seeker's record and Access tokens: fetch them alongside the
  // Applications, not after.
  const [applications, record, accessTokens] = await Promise.all([
    listApplications(user.id),
    format === "json" ? getJobSeeker(user.id) : null,
    format === "json" ? listAccessTokens(user.id) : [],
  ]);
  const body =
    format === "csv"
      ? applicationsCsv(applications)
      : dataExportJson(user, record, applications, accessTokens, now);

  return new Response(body, {
    headers: {
      "content-type": EXPORT_CONTENT_TYPES[format],
      "content-disposition": `attachment; filename="${exportFileName(format, now)}"`,
      "cache-control": "private, no-store",
    },
  });
}
