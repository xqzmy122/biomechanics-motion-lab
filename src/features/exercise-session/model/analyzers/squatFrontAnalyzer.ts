import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleAt,
  distance2,
  meanVisibility,
  midpoint,
  signedDistanceToLineNorm,
  toPoint2,
} from '@/features/exercise-session/lib/geometry'
import type { IExerciseThresholds } from '@/shared/types/exercise'

import type {
  IAnalyzerOutput,
  IFeedbackEvent,
  ISquatPhase,
  ISquatState,
} from '../types'

const IDX = {
  L_SH: 11,
  R_SH: 12,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANK: 27,
  R_ANK: 28,
} as const

const pickKneeAngle = (lm: NormalizedLandmark[]): number | null => {
  const leftVis = meanVisibility(lm, [IDX.L_HIP, IDX.L_KNEE, IDX.L_ANK])
  const rightVis = meanVisibility(lm, [IDX.R_HIP, IDX.R_KNEE, IDX.R_ANK])

  const leftAngle = (() => {
    const hip = toPoint2(lm[IDX.L_HIP])
    const knee = toPoint2(lm[IDX.L_KNEE])
    const ankle = toPoint2(lm[IDX.L_ANK])
    return angleAt(hip, knee, ankle)
  })()

  const rightAngle = (() => {
    const hip = toPoint2(lm[IDX.R_HIP])
    const knee = toPoint2(lm[IDX.R_KNEE])
    const ankle = toPoint2(lm[IDX.R_ANK])
    return angleAt(hip, knee, ankle)
  })()

  if (leftVis >= rightVis) return leftAngle
  return rightAngle
}

/** Medial collapse: knee shifts toward body midline relative to hip–ankle line */
const valgusOffset = (
  hip: ReturnType<typeof toPoint2>,
  knee: ReturnType<typeof toPoint2>,
  ankle: ReturnType<typeof toPoint2>,
  isLeftLeg: boolean,
): number | null => {
  const offset = signedDistanceToLineNorm(knee, hip, ankle)
  if (offset === null) return null
  return isLeftLeg ? offset : -offset
}

const measureTorsoShiftNorm = (lm: NormalizedLandmark[]): number | null => {
  const lSh = toPoint2(lm[IDX.L_SH])
  const rSh = toPoint2(lm[IDX.R_SH])
  const lHip = toPoint2(lm[IDX.L_HIP])
  const rHip = toPoint2(lm[IDX.R_HIP])
  const shMid = midpoint(lSh, rSh)
  const hipMid = midpoint(lHip, rHip)
  const shoulderWidth = distance2(lSh, rSh)
  if (shoulderWidth < 1e-4) return null
  return Math.abs(shMid.x - hipMid.x) / shoulderWidth
}

export const createInitialSquatFrontState = (): ISquatState => ({
  phase: 'stance',
  reps: 0,
  sawBottomThisRep: false,
})

export const analyzeSquatFrontFrame = (
  lm: NormalizedLandmark[],
  prev: ISquatState,
  t: IExerciseThresholds,
): { state: ISquatState; out: IAnalyzerOutput } => {
  const kneeAngle = pickKneeAngle(lm)
  const torsoShiftNorm = measureTorsoShiftNorm(lm)

  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  const isDescending =
    kneeAngle !== null && kneeAngle < t.kneeStandDeg - 8

  if (isDescending) {
    const lHip = toPoint2(lm[IDX.L_HIP])
    const rHip = toPoint2(lm[IDX.R_HIP])
    const lKnee = toPoint2(lm[IDX.L_KNEE])
    const rKnee = toPoint2(lm[IDX.R_KNEE])
    const lAnk = toPoint2(lm[IDX.L_ANK])
    const rAnk = toPoint2(lm[IDX.R_ANK])

    const leftValgus = valgusOffset(lHip, lKnee, lAnk, true)
    const rightValgus = valgusOffset(rHip, rKnee, rAnk, false)

    const worstValgus = Math.max(leftValgus ?? 0, rightValgus ?? 0)
    if (worstValgus > t.valgusMaxNorm) {
      events.push({
        id: 'KNEE_VALGUS',
        message: 'Push the knees outward — avoid letting them collapse inward.',
        severity: 'warning',
      })
      comments.push('Knee valgus detected during descent.')
    }

    if (torsoShiftNorm !== null && torsoShiftNorm > t.torsoShiftMaxNorm) {
      const lSh = toPoint2(lm[IDX.L_SH])
      const rSh = toPoint2(lm[IDX.R_SH])
      const shMid = midpoint(lSh, rSh)
      const hipMid = midpoint(lHip, rHip)
      const direction = shMid.x > hipMid.x ? 'right' : 'left'
      events.push({
        id: 'TORSO_SHIFT',
        message: `Keep the torso centered — you are leaning ${direction}.`,
        severity: 'warning',
      })
      comments.push(`Torso shifted ${direction} relative to hips.`)
    }
  }

  let phase: ISquatPhase = prev.phase
  let reps = prev.reps
  let sawBottom = prev.sawBottomThisRep

  if (kneeAngle === null) {
    return {
      state: prev,
      out: {
        hud: {
          phaseLabel: phase,
          kneeAngleDeg: null,
          torsoShiftNorm,
        },
        events,
        comments,
      },
    }
  }

  const STANCE_TO_ECCENTRIC_DELTA = 24
  const BOTTOM_EXIT_BUFFER = 14
  const STANCE_LOCKOUT_GAP = 4

  if (phase === 'stance') {
    if (kneeAngle < t.kneeStandDeg - STANCE_TO_ECCENTRIC_DELTA) phase = 'eccentric'
  } else if (phase === 'eccentric') {
    if (kneeAngle < t.kneeBottomDeg) {
      phase = 'bottom'
      sawBottom = true
    }
  } else if (phase === 'bottom') {
    if (kneeAngle > t.kneeBottomDeg + BOTTOM_EXIT_BUFFER) phase = 'concentric'
  } else if (phase === 'concentric') {
    if (kneeAngle > t.kneeStandDeg - STANCE_LOCKOUT_GAP) {
      phase = 'stance'
      if (sawBottom) reps += 1
      sawBottom = false
    }
  }

  return {
    state: { phase, reps, sawBottomThisRep: sawBottom },
    out: {
      hud: {
        phaseLabel: phase,
        kneeAngleDeg: kneeAngle,
        torsoShiftNorm,
      },
      events,
      comments,
    },
  }
}
