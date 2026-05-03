import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface IPoseFrame {
  landmarks: NormalizedLandmark[]
  timestampMs: number
}

export type IFeedbackEventId =
  | 'KNEE_OVER_TOE'
  | 'TORSO_LEAN'
  | 'DEPTH_OK'
  | 'DEPTH_SHALLOW'
  | 'BODY_LINE_BREAK'
  | 'ELBOW_FLARE'
  | 'POSTURE_REMINDER'

export interface IFeedbackEvent {
  id: IFeedbackEventId
  message: string
  severity: 'info' | 'warning' | 'success'
}

export interface ISessionHud {
  reps: number
  phaseLabel: string
  kneeAngleDeg: number | null
  elbowAngleDeg: number | null
  torsoLeanDeg: number | null
  bodyLineDevDeg: number | null
  badFrameFraction: number | null
  runtimeSec: number
}

export interface IAnalyzerOutput {
  hud: Partial<ISessionHud>
  events: IFeedbackEvent[]
  comments: string[]
}

export type ISquatPhase = 'stance' | 'eccentric' | 'bottom' | 'concentric'

export interface ISquatState {
  phase: ISquatPhase
  reps: number
  sawBottomThisRep: boolean
}

export type IPushupPhase = 'top' | 'bottom'

export interface IPushupState {
  phase: IPushupPhase
  reps: number
  sawBottomThisRep: boolean
}

export interface IPostureState {
  windowFlags: boolean[]
  windowMaxLen: number
  lastReminderAtMs: number
}
