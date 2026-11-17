# Access tokens open FastAPI to a job seeker's scripts

Amends [ADR 0001](0001-fastapi-behind-nextjs-with-authjs.md). FastAPI used to be reachable only by the Next.js server. A job seeker can now also call it directly, from a script, with an Access token: a long-lived secret they create on the Account page and send as `Authorization: Bearer …`. The first use is a cron job that adds an Interview when one appears in a calendar. The rest of ADR 0001 stands: the browser still never calls FastAPI, sign-in stays on Auth.js, and FastAPI still scopes every query to one job seeker id. An Access token resolves to the same id a web token carries, so route code doesn't know which kind it was given.

We chose personal tokens over a device-code sign-in or OAuth because a cron job can't sign in interactively: something has to hold a long-lived secret, and a token the job seeker can name, see and revoke is the simplest thing that does. A device-code flow for an interactive CLI can come later and issue these same tokens.

There is one kind of token, with no scopes: it reads and writes that job seeker's Applications and Interviews. It can't use the Account routes (onboarding, the job seeker's record, deleting the account, managing tokens), which accept web tokens only. So a leaked token can't delete the account or create tokens that outlive its own revocation. Tokens expire a year after they are created, so a forgotten one doesn't work forever.

Bigfoot stores only a SHA-256 hash of each secret and shows the secret once. A fast, unsalted hash is enough because the secret is 256 random bits, not a password a person chose. Secrets start with `bigfoot_`, so FastAPI can tell the two kinds of token apart without trying both, and secret scanners can recognize a leaked one. Revoking deletes the row; so does deleting the account.

The costs: FastAPI is now a public API, so its routes are a contract with scripts we don't control, and its abuse limits matter (per-IP rate limits, BIG-19). Each request with an Access token writes its last-used time. And without scopes, a script that only needs to add Interviews can also delete every Application.
