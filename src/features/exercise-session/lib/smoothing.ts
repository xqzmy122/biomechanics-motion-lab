import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export const smoothLandmarks = (
  prev: NormalizedLandmark[] | null,
  next: NormalizedLandmark[],
  alpha: number,
): NormalizedLandmark[] => {
  if (!prev || prev.length !== next.length) return next.map((l) => ({ ...l }))
  return next.map((l, i) => {
    const p = prev[i]
    if (!p) return { ...l }
    return {
      x: alpha * l.x + (1 - alpha) * p.x,
      y: alpha * l.y + (1 - alpha) * p.y,
      z: alpha * l.z + (1 - alpha) * p.z,
      visibility:
        l.visibility !== undefined && p.visibility !== undefined
          ? alpha * l.visibility + (1 - alpha) * p.visibility
          : l.visibility,
    }
  })
}
