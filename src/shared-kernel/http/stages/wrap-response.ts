/**
 * Identity pass-through (post-T6).
 *
 * Historically wrapped handler output in `{ success: true, data }`. After
 * T6 (envelope removed), handlers return the payload directly. This file
 * is kept so existing imports (`wrapResponse`, `responseWrapperStage`)
 * still resolve, but the function is now a no-op for plain values.
 */

export function wrapResponse(data: unknown): unknown {
  return data;
}
