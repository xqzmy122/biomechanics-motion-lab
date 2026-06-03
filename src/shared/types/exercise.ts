export type IExerciseId = 'squat' | 'pushup'

export type IAnalyzerKind = 'squat' | 'pushup'

export type ISquatCameraView = 'side' | 'front'

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
  valgusMaxNorm: number
  torsoShiftMaxNorm: number
  frontHipDropEccentricNorm: number
  frontHipDropBottomNorm: number
  frontHipDropStandNorm: number
  frontThighAngleEccentricDeg: number
  frontThighAngleBottomDeg: number
  smoothingAlpha: number
}

export interface IExerciseConfig {
  id: IExerciseId
  title: string
  summary: string
  cameraSetup: string
  cameraSetupFront?: string
  analyzerKind: IAnalyzerKind
  thresholds: IExerciseThresholds
}
