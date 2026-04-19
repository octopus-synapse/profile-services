/**
 * Per-resource viewer permissions/state, attached as `_viewer` on every
 * payload returned by a controller decorated with @WithViewer(builder).
 *
 * The shape is intentionally open so each resource can expose its own
 * action surface (Job: canApply/alreadyApplied; ResumeShare: canEdit/
 * hasPassword; etc.). Consumers in the UI just check for the keys they
 * need — no global enum to maintain.
 */
export type ViewerContext = Record<string, unknown>;

export interface WithViewer<T> {
  data: T;
  _viewer: ViewerContext;
}
