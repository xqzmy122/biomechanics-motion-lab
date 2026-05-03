import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface IPoint2 {
  x: number
  y: number
}

export const toPoint2 = (l: NormalizedLandmark): IPoint2 => ({
  x: l.x,
  y: l.y,
})

export const angleAt = (a: IPoint2, b: IPoint2, c: IPoint2): number | null => {
  const baX = a.x - b.x
  const baY = a.y - b.y
  const bcX = c.x - b.x
  const bcY = c.y - b.y
  const dot = baX * bcX + baY * bcY
  const mag = Math.hypot(baX, baY) * Math.hypot(bcX, bcY)
  if (mag < 1e-6) return null
  const cos = Math.min(1, Math.max(-1, dot / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

/** Angle between vector v and screen-up (0, -1), degrees 0–180 */
export const angleVsVertical = (vx: number, vy: number): number | null => {
  const mag = Math.hypot(vx, vy)
  if (mag < 1e-6) return null
  const ux = vx / mag
  const uy = vy / mag
  const upX = 0
  const upY = -1
  const dot = Math.min(1, Math.max(-1, ux * upX + uy * upY))
  return (Math.acos(dot) * 180) / Math.PI
}

/** Shortest angle between segment p1–p2 and horizontal line, degrees 0–90 */
export const segmentAngleVsHorizontal = (
  p1: IPoint2,
  p2: IPoint2,
): number | null => {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const mag = Math.hypot(dx, dy)
  if (mag < 1e-6) return null
  const theta = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI
  return theta
}

/** Signed distance from point p to infinite line through a–b (2D), normalised by |b-a| */
export const signedDistanceToLineNorm = (
  p: IPoint2,
  a: IPoint2,
  b: IPoint2,
): number | null => {
  const abX = b.x - a.x
  const abY = b.y - a.y
  const len = Math.hypot(abX, abY)
  if (len < 1e-6) return null
  const apX = p.x - a.x
  const apY = p.y - a.y
  const cross = abX * apY - abY * apX
  return cross / len
}

export const distance2 = (a: IPoint2, b: IPoint2): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const midpoint = (a: IPoint2, b: IPoint2): IPoint2 => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export const meanVisibility = (
  landmarks: NormalizedLandmark[],
  indices: number[],
): number => {
  let sum = 0
  let n = 0
  for (const i of indices) {
    const v = landmarks[i]?.visibility
    if (v === undefined) continue
    sum += v
    n += 1
  }
  return n === 0 ? 0 : sum / n
}
