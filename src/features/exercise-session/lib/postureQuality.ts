import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import { midpoint, toPoint2 } from '@/features/exercise-session/lib/geometry'
import type { IExerciseThresholds } from '@/shared/types/exercise'

const IDX = {
  NOSE: 0,
  L_EAR: 7,
  R_EAR: 8,
  L_SH: 11,
  R_SH: 12,
} as const

const MIN_LANDMARK_VIS = 0.22

export interface IPostureQuality {
  /** null when key landmarks are not visible enough to score */
  good: boolean | null
  /** Horizontal head shift vs ear midpoint (normalised 0–1 frame coords), magnitude */
  headShiftNorm: number
  /** Shoulder height asymmetry (|Δy| of shoulders in normalised coords) */
  shoulderAsymNorm: number
}

/**
 * Desk posture heuristic (2D, single camera):
 * - Head: compares nose vs midpoint of ears on the X axis (absolute shift). Forward head
 *   or side lean shows up as larger shift; mirrors / 3/4 view can add bias, so thresholds
 *   are kept forgiving.
 * - Shoulders: |right_shoulder.y − left_shoulder.y| — level collarbone → small value.
 */
export const evaluateDeskPosture = (
  lm: NormalizedLandmark[],
  t: IExerciseThresholds,
): IPostureQuality | null => {
  const nose = lm[IDX.NOSE]
  const earL = lm[IDX.L_EAR]
  const earR = lm[IDX.R_EAR]
  const shL = lm[IDX.L_SH]
  const shR = lm[IDX.R_SH]
  if (!nose || !earL || !earR || !shL || !shR) return null

  const visOk =
    (nose.visibility ?? 1) >= MIN_LANDMARK_VIS &&
    (earL.visibility ?? 1) >= MIN_LANDMARK_VIS &&
    (earR.visibility ?? 1) >= MIN_LANDMARK_VIS &&
    (shL.visibility ?? 1) >= MIN_LANDMARK_VIS &&
    (shR.visibility ?? 1) >= MIN_LANDMARK_VIS

  if (!visOk) return null

  const earMid = midpoint(toPoint2(earL), toPoint2(earR))
  const noseP = toPoint2(nose)
  const shLp = toPoint2(shL)
  const shRp = toPoint2(shR)

  const headShiftNorm = Math.abs(noseP.x - earMid.x)
  const shoulderAsymNorm = Math.abs(shRp.y - shLp.y)

  const good =
    headShiftNorm <= t.headForwardMaxNorm &&
    shoulderAsymNorm <= t.shoulderAsymmetryMaxNorm

  return { good, headShiftNorm, shoulderAsymNorm }
}

/** Looser gate for “ready to start monitoring” calibration */
export const evaluateDeskPostureCalibration = (
  lm: NormalizedLandmark[],
  t: IExerciseThresholds,
): IPostureQuality | null => {
  const q = evaluateDeskPosture(lm, {
    ...t,
    headForwardMaxNorm: t.headForwardMaxNorm * 1.65,
    shoulderAsymmetryMaxNorm: t.shoulderAsymmetryMaxNorm * 1.65,
  })
  return q
}
