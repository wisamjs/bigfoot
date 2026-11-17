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
  if (!isExportFormat(format)) return new Response("format must be csv or json", { status: 400 });

  const now = new Date();
  const applications = await listApplications(user.id);
  const body =
    format === "csv"
      ? applicationsCsv(applications)
      : dataExportJson(user, await getJobSeeker(user.id), applications, await listAccessTokens(user.id), now);

  return new Response(body, {
    headers: {
      "content-type": EXPORT_CONTENT_TYPES[format],
      "content-disposition": `attachment; filename="${exportFileName(format, now)}"`,
      "cache-control": "private, no-store",
    },
  });
}
