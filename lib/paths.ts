/**
 * Resolve the project base directory.
 *
 * In Next.js the working directory at runtime is the project root, so we use
 * `process.cwd()`. This helper exists so the path is defined in exactly one
 * place and can be overridden in tests / different runtimes later.
 */
export function getBaseDir(): string {
  return process.cwd();
}
