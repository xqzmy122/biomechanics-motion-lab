import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import {
  angleAt,
  meanVisibility,
  midpoint,
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
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
} as const

interface ISidePick {
  shoulder: number
  elbow: number
  wrist: number
}

const pickSide = (lm: NormalizedLandmark[]): ISidePick => {
  const leftVis = meanVisibility(lm, [IDX.L_SH, IDX.L_EL, IDX.L_WR])
  const rightVis = meanVisibility(lm, [IDX.R_SH, IDX.R_EL, IDX.R_WR])
  if (rightVis >= leftVis) {
    return { shoulder: IDX.R_SH, elbow: IDX.R_EL, wrist: IDX.R_WR }
  }
  return { shoulder: IDX.L_SH, elbow: IDX.L_EL, wrist: IDX.L_WR }
}

export const createInitialPushupState = (): IPushupState => ({
  phase: 'top',
  reps: 0,
  sawBottomThisRep: false,
})

export const analyzePushupFrame = (
  lm: NormalizedLandmark[],
  prev: IPushupState,
  t: IExerciseThresholds,
): { state: IPushupState; out: IAnalyzerOutput } => {
  const side = pickSide(lm)
  const sh = toPoint2(lm[side.shoulder])
  const el = toPoint2(lm[side.elbow])
  const wr = toPoint2(lm[side.wrist])
  const hipL = toPoint2(lm[IDX.L_HIP])
  const hipR = toPoint2(lm[IDX.R_HIP])
  const kneeL = toPoint2(lm[IDX.L_KNEE])
  const kneeR = toPoint2(lm[IDX.R_KNEE])
  const hip = midpoint(hipL, hipR)
  const knee = midpoint(kneeL, kneeR)

  const elbowAngle = angleAt(sh, el, wr)
  const shoulderMid = midpoint(
    toPoint2(lm[IDX.L_SH]),
    toPoint2(lm[IDX.R_SH]),
  )
  const lineAngle = angleAt(shoulderMid, hip, knee)
  const bodyLineDeg = lineAngle === null ? 0 : Math.abs(180 - lineAngle)

  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  if (
    bodyLineDeg > t.bodyLineMaxDeg &&
    elbowAngle !== null &&
    elbowAngle < t.elbowTopDeg - 15
  ) {
    events.push({
      id: 'BODY_LINE_BREAK',
      message: 'Keep hips in line with shoulders and knees — avoid sagging or piking.',
      severity: 'warning',
    })
    comments.push('Pelvis deviated from shoulder–knee line.')
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
          bodyLineDevDeg: bodyLineDeg,
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
  } else {
    if (elbowAngle > t.elbowTopDeg - 4) {
      phase = 'top'
      if (sawBottom) reps += 1
      sawBottom = false
    }
  }

  return {
    state: { phase, reps, sawBottomThisRep: sawBottom },
    out: {
      hud: {
        phaseLabel: phase,
        elbowAngleDeg: elbowAngle,
        bodyLineDevDeg: bodyLineDeg,
      },
      events,
      comments,
    },
  }
}
