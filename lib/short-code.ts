/**
 * Short code generation.
 *
 * We use `nanoid` with a custom, human-friendly alphabet (see env.ts) so that
 * generated codes avoid ambiguous characters. The generator is collision-safe:
 * callers ask the storage layer to retry on collision rather than this module
 * owning uniqueness — separation of concerns keeps the store the source of
 * truth.
 */

import { customAlphabet } from "nanoid";
import { SHORT_CODE_ALPHABET, SHORT_CODE_LENGTH } from "./env";

export const generateShortCode = customAlphabet(
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH
);

/** Regex that validates a code uses only the configured alphabet. */
export function isValidCodeFormat(code: string): boolean {
  if (code.length < 1 || code.length > 64) return false;
  const escaped = SHORT_CODE_ALPHABET.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const re = new RegExp(`^[${escaped}]+$`);
  return re.test(code);
}
