import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleAt,
  distance2,
  toPoint2,
} from '@/features/exercise-session/lib/geometry'
import type { IExerciseThresholds } from '@/shared/types/exercise'

import type {
  IAnalyzerOutput,
  IFeedbackEvent,
  IPushupPhase,
  IPushupState,
} from '../types'

const IDX = {
  L_SH: 11,
  R_SH: 12,
  L_EL: 13,
  R_EL: 14,
  L_WR: 15,
  R_WR: 16,
} as const

const averageElbowAngle = (lm: NormalizedLandmark[]): number | null => {
  const lSh = toPoint2(lm[IDX.L_SH])
  const rSh = toPoint2(lm[IDX.R_SH])
  const lEl = toPoint2(lm[IDX.L_EL])
  const rEl = toPoint2(lm[IDX.R_EL])
  const lWr = toPoint2(lm[IDX.L_WR])
  const rWr = toPoint2(lm[IDX.R_WR])

  const left = angleAt(lSh, lEl, lWr)
  const right = angleAt(rSh, rEl, rWr)

  if (left !== null && right !== null) return (left + right) / 2
  return left ?? right
}

/** Outward flare beyond the shoulder line (not distance from midline — that is ~0.5 at normal width). */
const measureElbowFlareNorm = (lm: NormalizedLandmark[]): number | null => {
  const lSh = toPoint2(lm[IDX.L_SH])
  const rSh = toPoint2(lm[IDX.R_SH])
  const lEl = toPoint2(lm[IDX.L_EL])
  const rEl = toPoint2(lm[IDX.R_EL])
  const shoulderWidth = distance2(lSh, rSh)
  if (shoulderWidth < 1e-4) return null

  const leftOutward = Math.max(0, lEl.x - lSh.x) / shoulderWidth
  const rightOutward = Math.max(0, rSh.x - rEl.x) / shoulderWidth
  return Math.max(leftOutward, rightOutward)
}

export const createInitialPushupFrontState = (): IPushupState => ({
  phase: 'top',
  reps: 0,
  sawBottomThisRep: false,
})

export const isPushupFrontTopPose = (
  lm: NormalizedLandmark[],
  t: IExerciseThresholds,
): boolean => {
  const elbowAngle = averageElbowAngle(lm)
  if (elbowAngle === null) return false
  return elbowAngle >= t.elbowTopDeg - 12
}

export const analyzePushupFrontFrame = (
  lm: NormalizedLandmark[],
  prev: IPushupState,
  t: IExerciseThresholds,
): { state: IPushupState; out: IAnalyzerOutput } => {
  const elbowAngle = averageElbowAngle(lm)
  const elbowFlareNorm = measureElbowFlareNorm(lm)

  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  const isDescending =
    elbowAngle !== null && elbowAngle < t.elbowTopDeg - 12

  if (
    isDescending &&
    elbowFlareNorm !== null &&
    elbowFlareNorm > t.elbowFlareRatio
  ) {
    events.push({
      id: 'ELBOW_FLARE',
      message: 'Tuck elbows slightly — avoid letting them flare far past the torso.',
      severity: 'warning',
    })
    comments.push('Elbow flare detected from front view.')
  }

  let phase: IPushupPhase = prev.phase
  let reps = prev.reps
  let sawBottom = prev.sawBottomThisRep

  if (elbowAngle === null) {
    return {
      state: prev,
      out: {
        hud: {
          phaseLabel: phase,
          elbowAngleDeg: null,
          elbowFlareNorm,
        },
        events,
        comments,
      },
    }
  }

  if (phase === 'top') {
    if (elbowAngle < t.elbowBottomDeg - 2) {
      phase = 'bottom'
      sawBottom = true
    }
  } else if (elbowAngle > t.elbowTopDeg - 4) {
    phase = 'top'
    if (sawBottom) reps += 1
    sawBottom = false
  }

  return {
    state: { phase, reps, sawBottomThisRep: sawBottom },
    out: {
      hud: {
        phaseLabel: phase,
        elbowAngleDeg: elbowAngle,
        elbowFlareNorm,
      },
      events,
      comments,
    },
  }
}
