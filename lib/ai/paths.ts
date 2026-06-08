// Path-containment guards for the Craft-Area-2 file IO.
//
// The upload route and the dev-only reference endpoint take a client-supplied
// session id (a single path segment) and, in one case, a client-supplied photo
// path (a relative path), then read/write under ./uploads and ./generated.
// Without containment, a value like "../../../tmp/evil" would escape those dirs.
//
// Both helpers are PURE (no IO) so the traversal defense lives in one tested
// place and can be unit-checked without touching the filesystem. `path` from
// `node:path` is used only for string resolution, not for any filesystem access.

import path from "node:path";

/**
 * Whether `id` is a safe single path segment to use as a directory name under
 * ./uploads or ./generated. Allowlist of `[A-Za-z0-9_-]` (plus a length cap) —
 * the exact shape `createSessionId()` (a crypto UUID) already produces, so a
 * legitimate session id always passes while `..`, slashes, dots, NUL, etc. are
 * rejected before they ever reach a filesystem path.
 */
export function isSafeSessionId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,200}$/.test(id);
}

/**
 * Resolve an untrusted, possibly-relative path against `root/subdir` and return
 * the absolute path only if it stays strictly inside that directory; otherwise
 * return `null`. Uses a true directory-boundary check (not a string prefix), so
 * a sibling like `uploads_secrets/` or `uploadsX/` is rejected even though it
 * shares the `uploads` prefix. The directory itself (no child file) is also
 * rejected — callers always want a file under it.
 */
export function resolveUnder(
  root: string,
  subdir: string,
  untrustedPath: string,
): string | null {
  const base = path.resolve(root, subdir);
  const resolved = path.resolve(root, untrustedPath);
  const rel = path.relative(base, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return resolved;
}
