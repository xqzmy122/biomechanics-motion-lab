export type IExerciseId = 'squat' | 'pushup' | 'posture'

export type IAnalyzerKind = 'squat' | 'pushup' | 'posture'

export interface IExerciseThresholds {
  kneeBottomDeg: number
  kneeStandDeg: number
  elbowBottomDeg: number
  elbowTopDeg: number
  torsoLeanMaxDeg: number
  kneeOverToeFootFraction: number
  depthHipBelowKneeEnabled: boolean
  bodyLineMaxDeg: number
  elbowFlareRatio: number
  headForwardMaxNorm: number
  shoulderAsymmetryMaxNorm: number
  postureWindowSec: number
  postureBadFraction: number
  postureReminderIntervalMin: number
  smoothingAlpha: number
}

export interface IExerciseConfig {
  id: IExerciseId
  title: string
  summary: string
  cameraSetup: string
  analyzerKind: IAnalyzerKind
  thresholds: IExerciseThresholds
}
