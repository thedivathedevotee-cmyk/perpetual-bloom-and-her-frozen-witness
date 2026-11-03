/* Build inputs are never part of the local reader's served surface. */

const PROTECTED_FILES = new Set(['data/book.json']);
const PROTECTED_DIRECTORIES = ['content/', 'src/'];

export function isProtectedRelativePath(relativePath) {
  /* Windows resolves paths case-insensitively. Applying the same comparison
     everywhere avoids a platform-dependent plaintext exposure. */
  const relative = String(relativePath).replaceAll('\\', '/').toLowerCase();
  return PROTECTED_FILES.has(relative)
    || PROTECTED_DIRECTORIES.some((directory) => relative === directory.slice(0, -1) || relative.startsWith(directory));
}

export function isBlockedRelativePath(relativePath) {
  const relative = String(relativePath).replaceAll('\\', '/');
  /* Win32 folds trailing spaces and dots in every path component. Reject
     those aliases before serving so a protected directory cannot be reached
     through a spelling that differs from its denylist entry. */
  const hasWindowsAlias = relative.split('/').some((part) => part && /[. ]+$/.test(part));
  return hasWindowsAlias || isProtectedRelativePath(relative);
}
