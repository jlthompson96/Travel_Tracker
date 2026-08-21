/**
 * lib/writeToken.ts
 *
 * The site password, kept so it can be sent as the write credential.
 *
 * Be clear-eyed about what this buys: it stops the write endpoint from being
 * open to the whole internet, and nothing more. Anyone who can unlock the site
 * can also write to it — there are no per-user identities here. That is a
 * deliberate trade for a two-person travel log; if this ever needs "Sarah can
 * edit, guests can't", it needs real auth (Vercel + an OAuth provider), not a
 * bigger shared secret.
 *
 * The password only ever leaves the browser over HTTPS to our own API route,
 * which compares it against TT_WRITE_SECRET in constant time.
 */

const TOKEN_KEY = 'travel-tracker-write-token';

export function readWriteToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeWriteToken(password: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, password);
  } catch {
    // Private browsing with storage disabled: the app still reads fine, edits
    // just won't be authorized. Nothing to recover from here.
  }
}

/**
 * Whether editing controls should render at all. False when the site has no
 * password configured (VITE_SITE_PASSWORD_HASH unset, e.g. local dev without
 * credentials) — there's no token to send, so the API would reject every write.
 */
export function canAttemptWrites(): boolean {
  return readWriteToken() !== null;
}
