import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Browser error reports (BIG-14). Session Replay stays off: it would record job seekers'
// Applications. Reports go through this app's own server (`tunnel`), so ad blockers don't drop them.
Sentry.init({ ...sentryOptions(), tunnel: true });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
