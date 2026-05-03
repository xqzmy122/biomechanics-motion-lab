import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleAt,
  meanVisibility,
  toPoint2,
} from '@/features/exercise-session/lib/geometry'
import { evaluateDeskPostureCalibration } from '@/features/exercise-session/lib/postureQuality'
import type { IAnalyzerKind, IExerciseThresholds } from '@/shared/types/exercise'

const SQUAT_IDX = {
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANK: 27,
  R_ANK: 28,
  L_SH: 11,
  R_SH: 12,
} as const

const pickSquatSide = (lm: NormalizedLandmark[]) => {
  const leftVis = meanVisibility(lm, [
    SQUAT_IDX.L_HIP,
    SQUAT_IDX.L_KNEE,
    SQUAT_IDX.L_ANK,
  ])
  const rightVis = meanVisibility(lm, [
    SQUAT_IDX.R_HIP,
    SQUAT_IDX.R_KNEE,
    SQUAT_IDX.R_ANK,
  ])
  return rightVis >= leftVis
    ? {
        hip: SQUAT_IDX.R_HIP,
        knee: SQUAT_IDX.R_KNEE,
        ankle: SQUAT_IDX.R_ANK,
        shoulder: SQUAT_IDX.R_SH,
      }
    : {
        hip: SQUAT_IDX.L_HIP,
        knee: SQUAT_IDX.L_KNEE,
        ankle: SQUAT_IDX.L_ANK,
        shoulder: SQUAT_IDX.L_SH,
      }
}

const PUSH_IDX = {
  L_SH: 11,
  R_SH: 12,
  L_EL: 13,
  R_EL: 14,
  L_WR: 15,
  R_WR: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
} as const

const pickPushSide = (lm: NormalizedLandmark[]) => {
  const leftVis = meanVisibility(lm, [
    PUSH_IDX.L_SH,
    PUSH_IDX.L_EL,
    PUSH_IDX.L_WR,
  ])
  const rightVis = meanVisibility(lm, [
    PUSH_IDX.R_SH,
    PUSH_IDX.R_EL,
    PUSH_IDX.R_WR,
  ])
  return rightVis >= leftVis
    ? {
        shoulder: PUSH_IDX.R_SH,
        elbow: PUSH_IDX.R_EL,
        wrist: PUSH_IDX.R_WR,
        hip: PUSH_IDX.R_HIP,
        knee: PUSH_IDX.R_KNEE,
      }
    : {
        shoulder: PUSH_IDX.L_SH,
        elbow: PUSH_IDX.L_EL,
        wrist: PUSH_IDX.L_WR,
        hip: PUSH_IDX.L_HIP,
        knee: PUSH_IDX.L_KNEE,
      }
}

const MIN_VIS = 0.32

const isSquatSideVisible = (lm: NormalizedLandmark[], side: ReturnType<typeof pickSquatSide>) =>
  meanVisibility(lm, [side.hip, side.knee, side.ankle, side.shoulder]) >= MIN_VIS

const isPushSideVisible = (lm: NormalizedLandmark[], side: ReturnType<typeof pickPushSide>) =>
  meanVisibility(lm, [side.shoulder, side.elbow, side.wrist, side.hip, side.knee]) >=
  MIN_VIS

export const isCalibrationPoseOk = (
  kind: IAnalyzerKind,
  lm: NormalizedLandmark[],
  t: IExerciseThresholds,
): boolean => {
  if (kind === 'squat') {
    const side = pickSquatSide(lm)
    if (!isSquatSideVisible(lm, side)) return false
    const hip = toPoint2(lm[side.hip])
    const knee = toPoint2(lm[side.knee])
    const ankle = toPoint2(lm[side.ankle])
    const kneeAngle = angleAt(hip, knee, ankle)
    if (kneeAngle === null) return false
    return kneeAngle >= t.kneeStandDeg - 6
  }

  if (kind === 'pushup') {
    const side = pickPushSide(lm)
    if (!isPushSideVisible(lm, side)) return false
    const sh = toPoint2(lm[side.shoulder])
    const el = toPoint2(lm[side.elbow])
    const wr = toPoint2(lm[side.wrist])
    const elbowAngle = angleAt(sh, el, wr)
    if (elbowAngle === null) return false
    const hipL = toPoint2(lm[PUSH_IDX.L_HIP])
    const hipR = toPoint2(lm[PUSH_IDX.R_HIP])
    const kneeL = toPoint2(lm[PUSH_IDX.L_KNEE])
    const kneeR = toPoint2(lm[PUSH_IDX.R_KNEE])
    const hip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 }
    const knee = { x: (kneeL.x + kneeR.x) / 2, y: (kneeL.y + kneeR.y) / 2 }
    const shoulderMid = {
      x: (toPoint2(lm[PUSH_IDX.L_SH]).x + toPoint2(lm[PUSH_IDX.R_SH]).x) / 2,
      y: (toPoint2(lm[PUSH_IDX.L_SH]).y + toPoint2(lm[PUSH_IDX.R_SH]).y) / 2,
    }
    const lineAngle = angleAt(shoulderMid, hip, knee)
    const bodyLineDeg = lineAngle === null ? 999 : Math.abs(180 - lineAngle)
    return elbowAngle >= t.elbowTopDeg - 12 && bodyLineDeg <= t.bodyLineMaxDeg + 12
  }

  const q = evaluateDeskPostureCalibration(lm, t)
  if (q === null || q.good === null) return false
  return q.good
}

/** True when person / key joints are missing — calibration bar should reset */
const POSTURE_VISIBILITY_IDX = [0, 7, 8, 11, 12] as const

export const isCalibrationVisible = (
  kind: IAnalyzerKind,
  lm: NormalizedLandmark[],
): boolean => {
  if (kind === 'squat') {
    const side = pickSquatSide(lm)
    return isSquatSideVisible(lm, side)
  }
  if (kind === 'pushup') {
    const side = pickPushSide(lm)
    return isPushSideVisible(lm, side)
  }
  return meanVisibility(lm, [...POSTURE_VISIBILITY_IDX]) >= 0.24
}
