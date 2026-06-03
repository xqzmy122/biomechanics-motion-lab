import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleAt,
  angleVsVertical,
  meanVisibility,
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
  L_HEEL: 29,
  R_HEEL: 30,
  L_TOE: 31,
  R_TOE: 32,
} as const

interface ISidePick {
  hip: number
  knee: number
  ankle: number
  heel: number
  toe: number
  shoulder: number
}

const pickSide = (lm: NormalizedLandmark[]): ISidePick => {
  const leftVis = meanVisibility(lm, [
    IDX.L_HIP,
    IDX.L_KNEE,
    IDX.L_ANK,
    IDX.L_TOE,
  ])
  const rightVis = meanVisibility(lm, [
    IDX.R_HIP,
    IDX.R_KNEE,
    IDX.R_ANK,
    IDX.R_TOE,
  ])
  if (rightVis >= leftVis) {
    return {
      hip: IDX.R_HIP,
      knee: IDX.R_KNEE,
      ankle: IDX.R_ANK,
      heel: IDX.R_HEEL,
      toe: IDX.R_TOE,
      shoulder: IDX.R_SH,
    }
  }
  return {
    hip: IDX.L_HIP,
    knee: IDX.L_KNEE,
    ankle: IDX.L_ANK,
    heel: IDX.L_HEEL,
    toe: IDX.L_TOE,
    shoulder: IDX.L_SH,
  }
}

const kneeOverToeRatio = (
  lm: NormalizedLandmark[],
  side: ISidePick,
): number | null => {
  const heel = toPoint2(lm[side.heel])
  const toe = toPoint2(lm[side.toe])
  const knee = toPoint2(lm[side.knee])
  const footX = toe.x - heel.x
  const footY = toe.y - heel.y
  const footLen = Math.hypot(footX, footY)
  if (footLen < 1e-4) return null
  const ux = footX / footLen
  const uy = footY / footLen
  const relX = knee.x - heel.x
  const relY = knee.y - heel.y
  return (relX * ux + relY * uy) / footLen
}

const trackMinKneeAngle = (current: number | null, kneeAngle: number): number =>
  current === null ? kneeAngle : Math.min(current, kneeAngle)

/** Depth at the deepest point of the rep — knee angle is reliable in side view; hip.y vs knee.y is not */
const appendDepthFeedback = (
  events: IFeedbackEvent[],
  comments: string[],
  minKneeAngleDeg: number,
  t: IExerciseThresholds,
) => {
  if (minKneeAngleDeg <= t.depthParallelDeg) {
    events.push({
      id: 'DEPTH_OK',
      message: 'Good depth — parallel squat reached.',
      severity: 'success',
    })
    return
  }

  events.push({
    id: 'DEPTH_SHALLOW',
    message: 'Try a bit more depth — sink the hips slightly lower.',
    severity: 'info',
  })
  comments.push(
    `Shallow depth — minimum knee angle ${Math.round(minKneeAngleDeg)}° (target ≤ ${t.depthParallelDeg}°).`,
  )
}

export const createInitialSquatState = (): ISquatState => ({
  phase: 'stance',
  reps: 0,
  sawBottomThisRep: false,
  minKneeAngleDeg: null,
})

export const analyzeSquatFrame = (
  lm: NormalizedLandmark[],
  prev: ISquatState,
  t: IExerciseThresholds,
): { state: ISquatState; out: IAnalyzerOutput } => {
  const side = pickSide(lm)
  const hip = toPoint2(lm[side.hip])
  const knee = toPoint2(lm[side.knee])
  const ankle = toPoint2(lm[side.ankle])
  const shoulder = toPoint2(lm[side.shoulder])

  const kneeAngle = angleAt(hip, knee, ankle)
  const torsoVecX = shoulder.x - hip.x
  const torsoVecY = shoulder.y - hip.y
  const torsoLean = angleVsVertical(torsoVecX, torsoVecY)

  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  const kneeOver = kneeOverToeRatio(lm, side)
  if (
    kneeOver !== null &&
    kneeOver > 1 + t.kneeOverToeFootFraction &&
    kneeAngle !== null &&
    kneeAngle < t.kneeStandDeg - 8
  ) {
    events.push({
      id: 'KNEE_OVER_TOE',
      message: 'Keep the knee stacked over the mid-foot — avoid drifting past the toes.',
      severity: 'warning',
    })
    comments.push('Knee tracked forward of the foot line during descent.')
  }

  if (
    torsoLean !== null &&
    torsoLean > t.torsoLeanMaxDeg &&
    kneeAngle !== null &&
    kneeAngle < t.kneeStandDeg - 5
  ) {
    events.push({
      id: 'TORSO_LEAN',
      message: 'Reduce forward lean — stay more upright through the hips.',
      severity: 'warning',
    })
    comments.push('Torso leaned forward beyond target range.')
  }

  let phase: ISquatPhase = prev.phase
  let reps = prev.reps
  let sawBottom = prev.sawBottomThisRep
  let minKneeAngleDeg = prev.minKneeAngleDeg

  if (kneeAngle === null) {
    return {
      state: prev,
      out: {
        hud: {
          phaseLabel: phase,
          kneeAngleDeg: null,
          torsoLeanDeg: torsoLean,
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
    if (kneeAngle < t.kneeStandDeg - STANCE_TO_ECCENTRIC_DELTA) {
      phase = 'eccentric'
      minKneeAngleDeg = kneeAngle
    }
  } else if (phase === 'eccentric') {
    minKneeAngleDeg = trackMinKneeAngle(minKneeAngleDeg, kneeAngle)
    if (kneeAngle < t.kneeBottomDeg) {
      phase = 'bottom'
      sawBottom = true
    }
  } else if (phase === 'bottom') {
    minKneeAngleDeg = trackMinKneeAngle(minKneeAngleDeg, kneeAngle)
    if (kneeAngle > t.kneeBottomDeg + BOTTOM_EXIT_BUFFER) {
      phase = 'concentric'
      if (t.depthHipBelowKneeEnabled && sawBottom && minKneeAngleDeg !== null) {
        appendDepthFeedback(events, comments, minKneeAngleDeg, t)
      }
    }
  } else if (phase === 'concentric') {
    if (kneeAngle > t.kneeStandDeg - STANCE_LOCKOUT_GAP) {
      phase = 'stance'
      if (sawBottom) reps += 1
      sawBottom = false
      minKneeAngleDeg = null
    }
  }

  return {
    state: { phase, reps, sawBottomThisRep: sawBottom, minKneeAngleDeg },
    out: {
      hud: {
        phaseLabel: phase,
        kneeAngleDeg: kneeAngle,
        torsoLeanDeg: torsoLean,
      },
      events,
      comments,
    },
  }
}
