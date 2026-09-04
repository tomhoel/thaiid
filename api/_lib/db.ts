import { neon } from '@neondatabase/serverless';

/**
 * Neon HTTP client.
 *
 * One query per HTTP round trip, which suits serverless functions far better
 * than a pooled TCP connection that would not survive between invocations.
 *
 * Always call this as a tagged template — `sql`...`` — so values are sent as
 * bound parameters. Never build a query by string concatenation.
 */

/**
 * Neon's own signature is a union across its arrayMode/fullResults options,
 * which makes every result unindexable. We only ever use the default row mode,
 * so narrow it to that here rather than casting at each call site.
 */
type SqlTag = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

let cached: SqlTag | null = null;

export function db(): SqlTag {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  cached = neon(url) as unknown as SqlTag;
  return cached;
}
