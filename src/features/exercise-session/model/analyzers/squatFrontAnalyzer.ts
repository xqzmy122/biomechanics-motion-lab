import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleVsVertical,
  distance2,
  midpoint,
  signedDistanceToLineNorm,
  toPoint2,
} from '@/features/exercise-session/lib/geometry'
import type { IExerciseThresholds } from '@/shared/types/exercise'

import type {
  IAnalyzerOutput,
  IFeedbackEvent,
  ISquatFrontState,
  ISquatPhase,
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

interface IFrontSquatMetrics {
  hipMidY: number
  thighAngleDeg: number
  bodyScale: number
  torsoShiftNorm: number | null
}

const measureFrontSquatMetrics = (lm: NormalizedLandmark[]): IFrontSquatMetrics | null => {
  const lSh = toPoint2(lm[IDX.L_SH])
  const rSh = toPoint2(lm[IDX.R_SH])
  const lHip = toPoint2(lm[IDX.L_HIP])
  const rHip = toPoint2(lm[IDX.R_HIP])
  const lKnee = toPoint2(lm[IDX.L_KNEE])
  const rKnee = toPoint2(lm[IDX.R_KNEE])

  const hipMid = midpoint(lHip, rHip)
  const shMid = midpoint(lSh, rSh)
  const bodyScale = distance2(hipMid, shMid)
  if (bodyScale < 1e-4) return null

  const lThigh = angleVsVertical(lHip.x - lKnee.x, lHip.y - lKnee.y)
  const rThigh = angleVsVertical(rHip.x - rKnee.x, rHip.y - rKnee.y)
  if (lThigh === null && rThigh === null) return null

  const thighAngleDeg = Math.max(lThigh ?? 0, rThigh ?? 0)
  const shoulderWidth = distance2(lSh, rSh)
  const torsoShiftNorm =
    shoulderWidth < 1e-4 ? null : Math.abs(shMid.x - hipMid.x) / shoulderWidth

  return {
    hipMidY: hipMid.y,
    thighAngleDeg,
    bodyScale,
    torsoShiftNorm,
  }
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

const ensureBaseline = (
  prev: ISquatFrontState,
  metrics: IFrontSquatMetrics,
): ISquatFrontState => {
  if (
    prev.baselineHipY !== null &&
    prev.baselineThighAngleDeg !== null &&
    prev.bodyScale !== null
  ) {
    return prev
  }

  return {
    ...prev,
    baselineHipY: metrics.hipMidY,
    baselineThighAngleDeg: metrics.thighAngleDeg,
    bodyScale: metrics.bodyScale,
  }
}

const isDescending = (
  hipDropNorm: number,
  thighDeltaDeg: number,
  t: IExerciseThresholds,
): boolean =>
  hipDropNorm > t.frontHipDropEccentricNorm * 0.55 ||
  thighDeltaDeg > t.frontThighAngleEccentricDeg * 0.55

export const createInitialSquatFrontState = (): ISquatFrontState => ({
  phase: 'stance',
  reps: 0,
  sawBottomThisRep: false,
  baselineHipY: null,
  baselineThighAngleDeg: null,
  bodyScale: null,
})

export const analyzeSquatFrontFrame = (
  lm: NormalizedLandmark[],
  prev: ISquatFrontState,
  t: IExerciseThresholds,
): { state: ISquatFrontState; out: IAnalyzerOutput } => {
  const metrics = measureFrontSquatMetrics(lm)
  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  if (metrics === null) {
    return {
      state: prev,
      out: {
        hud: {
          phaseLabel: prev.phase,
          kneeAngleDeg: null,
          torsoShiftNorm: null,
          hipDropNorm: null,
        },
        events,
        comments,
      },
    }
  }

  let state = ensureBaseline(prev, metrics)

  if (
    state.baselineHipY === null ||
    state.baselineThighAngleDeg === null ||
    state.bodyScale === null
  ) {
    return {
      state,
      out: {
        hud: {
          phaseLabel: state.phase,
          kneeAngleDeg: metrics.thighAngleDeg,
          torsoShiftNorm: metrics.torsoShiftNorm,
          hipDropNorm: 0,
        },
        events,
        comments,
      },
    }
  }

  const hipDropNorm = (metrics.hipMidY - state.baselineHipY) / state.bodyScale
  const thighDeltaDeg = metrics.thighAngleDeg - state.baselineThighAngleDeg
  const descending = isDescending(hipDropNorm, thighDeltaDeg, t)

  if (descending) {
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

    if (
      metrics.torsoShiftNorm !== null &&
      metrics.torsoShiftNorm > t.torsoShiftMaxNorm
    ) {
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

  const atBottom =
    hipDropNorm >= t.frontHipDropBottomNorm ||
    thighDeltaDeg >= t.frontThighAngleBottomDeg

  const atStand =
    hipDropNorm <= t.frontHipDropStandNorm &&
    thighDeltaDeg <= t.frontThighAngleEccentricDeg * 0.45

  let phase: ISquatPhase = state.phase
  let reps = state.reps
  let sawBottom = state.sawBottomThisRep

  if (phase === 'stance') {
    if (
      hipDropNorm >= t.frontHipDropEccentricNorm ||
      thighDeltaDeg >= t.frontThighAngleEccentricDeg
    ) {
      phase = 'eccentric'
    }
  } else if (phase === 'eccentric') {
    if (atBottom) {
      phase = 'bottom'
      sawBottom = true
    }
  } else if (phase === 'bottom') {
    if (!atBottom) phase = 'concentric'
  } else if (phase === 'concentric') {
    if (atStand) {
      phase = 'stance'
      if (sawBottom) reps += 1
      sawBottom = false
    }
  }

  state = { ...state, phase, reps, sawBottomThisRep: sawBottom }

  return {
    state,
    out: {
      hud: {
        phaseLabel: phase,
        kneeAngleDeg: metrics.thighAngleDeg,
        torsoShiftNorm: metrics.torsoShiftNorm,
        hipDropNorm,
      },
      events,
      comments,
    },
  }
}

export const isFrontSquatStanding = (
  lm: NormalizedLandmark[],
  t: IExerciseThresholds,
): boolean => {
  const metrics = measureFrontSquatMetrics(lm)
  if (metrics === null) return false
  return metrics.thighAngleDeg <= t.frontThighAngleEccentricDeg + 6
}
