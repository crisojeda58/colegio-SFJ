
/**
 * Sanitizes a filename by removing or replacing characters that are often
 * problematic in file systems and URLs.
 * 
 * @param filename The original filename.
 * @returns A sanitized version of the filename.
 */
export function sanitize(filename: string): string {
  // Replaces whitespace with underscores and removes any character that is not
  // an alphanumeric character, a dot, an underscore, or a hyphen.
  return filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
}
