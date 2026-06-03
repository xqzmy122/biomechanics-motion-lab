import type { IExerciseConfig } from '@/shared/types/exercise'

const DEFAULT_THRESHOLDS = {
  kneeBottomDeg: 105,
  kneeStandDeg: 158,
  elbowBottomDeg: 95,
  elbowTopDeg: 158,
  torsoLeanMaxDeg: 42,
  kneeOverToeFootFraction: 0.32,
  depthHipBelowKneeEnabled: true,
  bodyLineMaxDeg: 18,
  elbowFlareRatio: 0.52,
  valgusMaxNorm: 0.045,
  torsoShiftMaxNorm: 0.055,
  frontHipDropEccentricNorm: 0.1,
  frontHipDropBottomNorm: 0.22,
  frontHipDropStandNorm: 0.06,
  frontThighAngleEccentricDeg: 14,
  frontThighAngleBottomDeg: 32,
  smoothingAlpha: 0.55,
} as const

export const EXERCISES: IExerciseConfig[] = [
  {
    id: 'squat',
    title: 'Squats',
    summary:
      'Side or front view — pick the camera angle before you start. Side checks depth and lean; front checks knee valgus and lateral torso shift.',
    cameraSetup:
      'Place the phone at mid-thigh height, 2.5–4 m away, side view. Keep your whole torso and feet in frame.',
    cameraSetupFront:
      'Place the phone at chest height, 2–3 m away, facing you. Frame both knees, hips, and shoulders — full body width visible.',
    analyzerKind: 'squat',
    thresholds: { ...DEFAULT_THRESHOLDS },
  },
  {
    id: 'pushup',
    title: 'Push-ups',
    summary:
      'Side or slight diagonal view so elbows, shoulders, pelvis, and knees are visible.',
    cameraSetup:
      'Side view preferred. Frame elbow, shoulder, pelvis, and knee on the working side.',
    analyzerKind: 'pushup',
    thresholds: { ...DEFAULT_THRESHOLDS },
  },
]

export const getExerciseById = (id: string): IExerciseConfig | undefined =>
  EXERCISES.find((e) => e.id === id)
