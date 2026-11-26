// tslint:disable
/* eslint-disable */

/**
 * Delta Compression Helpers for Real-Time Multiplayer State Synchronization.
 *
 * Used to compute sparse diffs of JSON state objects before transmitting over
 * WebRTC / WebSocket channels, and reconstruct the full state upon receipt.
 */

/**
 * Computes a sparse delta between two state objects.
 * Returns `undefined` if there are no changes.
 * Keys named 'tick' are ignored in diff calculation.
 */
export function getGameStateDiff(oldState: any, newState: any): any {
  if (oldState === newState) return undefined;
  if (typeof oldState !== typeof newState) return newState;
  if (typeof newState !== 'object' || newState === null) return newState;

  if (Array.isArray(newState)) {
    if (!oldState || oldState.length !== newState.length) return newState;
    for (let i = 0; i < newState.length; i++) {
      if (getGameStateDiff(oldState[i], newState[i]) !== undefined) {
        return newState;
      }
    }
    return undefined;
  }

  const diff: any = {};
  let hasChanges = false;
  for (const key in newState) {
    if (Object.prototype.hasOwnProperty.call(newState, key)) {
      if (key === 'tick') continue;
      const d = getGameStateDiff(oldState?.[key], newState[key]);
      if (d !== undefined) {
        diff[key] = d;
        hasChanges = true;
      }
    }
  }
  return hasChanges ? diff : undefined;
}

/**
 * Deeply merges a sparse delta diff into a base state object to reconstruct
 * the full state.
 */
export function mergeGameStateDiff(target: any, diff: any): any {
  if (typeof diff !== 'object' || diff === null) return diff;
  if (Array.isArray(diff)) return diff;

  const t = target || {};
  const result = {...t};
  for (const key in diff) {
    if (Object.prototype.hasOwnProperty.call(diff, key)) {
      result[key] = mergeGameStateDiff(t[key], diff[key]);
    }
  }
  return result;
}
