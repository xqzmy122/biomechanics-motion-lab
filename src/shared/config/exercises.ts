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
  headForwardMaxNorm: 0.062,
  shoulderAsymmetryMaxNorm: 0.052,
  postureWindowSec: 36,
  postureBadFraction: 0.58,
  postureReminderIntervalMin: 2,
  smoothingAlpha: 0.55,
} as const

export const EXERCISES: IExerciseConfig[] = [
  {
    id: 'squat',
    title: 'Squats',
    summary:
      'Side view: mid-thigh camera height, 2.5–4 m back, full torso and feet visible.',
    cameraSetup:
      'Place the phone at mid-thigh height, 2.5–4 m away, side view. Keep your whole torso and feet in frame.',
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
  {
    id: 'posture',
    title: 'Desk posture',
    summary:
      'Front or 3/4 view: stable desk, upper torso and head in frame while seated.',
    cameraSetup:
      'Front or 3/4 view. Upper torso and head visible; keep the laptop position steady.',
    analyzerKind: 'posture',
    thresholds: { ...DEFAULT_THRESHOLDS },
  },
]

export const getExerciseById = (id: string): IExerciseConfig | undefined =>
  EXERCISES.find((e) => e.id === id)
