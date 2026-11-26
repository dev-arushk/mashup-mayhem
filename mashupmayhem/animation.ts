export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const lerp = (from: number, to: number, t: number): number => {
  const clamped = clamp01(t);
  return from + (to - from) * clamped;
};

export const easeOutCubic = (t: number): number => {
  const clamped = clamp01(t);
  const inv = 1 - clamped;
  return 1 - inv * inv * inv;
};

export const easeInOutQuad = (t: number): number => {
  const clamped = clamp01(t);
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
};

export const createPulse = (timeSeconds: number, speed = 1): number => {
  const phase = (timeSeconds * speed) % 1;
  return easeInOutQuad(phase);
};
