/** What a job seeker types to confirm deleting their account (src/app/account). */
export const DELETE_CONFIRMATION = "DELETE";

/** Where a deleted job seeker lands: the landing page, which then confirms the deletion. */
export const ACCOUNT_DELETED_PATH = "/?account=deleted";

/** The longest name an Access token can have; the API and the database enforce it too. */
export const ACCESS_TOKEN_NAME_MAX = 100;

/** How long an Access token works after it is created; set by the access_tokens table's default. */
export const ACCESS_TOKEN_LIFETIME = "one year";

/** Where job seekers remove Bigfoot's access to their Google account. */
export const GOOGLE_PERMISSIONS_URL = "https://myaccount.google.com/permissions";
