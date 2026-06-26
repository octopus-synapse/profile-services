/**
 * PROD-only seeds. Currently NONE — production runs the shared reference
 * catalogs only (see ../shared). This is the extension point for any future
 * prod-specific bootstrap. Keep the same invariant as shared: idempotent, no
 * external I/O, no per-row scaling cost (it runs on every deploy).
 */
export async function runProdSeeds(): Promise<void> {
  // Intentionally empty. Add prod-specific idempotent seeders here.
}
