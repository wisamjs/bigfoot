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

/** The longest label a Share link can have; the API and the database enforce it too. */
export const SHARE_LINK_LABEL_MAX = 100;

/** A Passcode's length limits, as the API checks them. */
export const PASSCODE_MIN_LENGTH = 8;
export const PASSCODE_MAX_LENGTH = 128;

/** How many Share links a job seeker can have at once; the API enforces it. */
export const SHARE_LINKS_MAX = 10;

/** How long a Share link works after it is created or renewed; set by the API. */
export const SHARE_LINK_LIFETIME_DAYS = 7;
