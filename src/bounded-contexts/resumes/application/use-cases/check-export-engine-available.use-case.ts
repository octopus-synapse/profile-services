/**
 * Check Export Engine Available Use Case
 *
 * Resumes-side gate that surfaces a typed
 * `ExportEngineUnavailableException` when the upstream export adapter
 * declares itself unhealthy. Lives here (not in the `export` BC) so the
 * resumes domain owns the language of "resume export to <format> is
 * temporarily unavailable" — the export BC stays focused on the engine
 * mechanics; the resumes BC owns the user-facing semantics.
 *
 * Pattern: callers pass a probe function (typically `() =>
 * exportEngine.healthCheck(format)`) so this use case stays decoupled
 * from any particular adapter.
 */

import { ExportEngineUnavailableException } from '../../domain/exceptions';

export interface ExportEngineProbe {
  /** Returns true when the engine for `format` is ready, false otherwise. */
  isAvailable(format: string): Promise<boolean> | boolean;
}

export class CheckExportEngineAvailableUseCase {
  constructor(private readonly probe: ExportEngineProbe) {}

  async execute(format: string): Promise<void> {
    const ready = await Promise.resolve(this.probe.isAvailable(format));
    if (!ready) {
      throw new ExportEngineUnavailableException(format);
    }
  }
}
