import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import { evaluateDeskPosture } from '@/features/exercise-session/lib/postureQuality'
import type { IExerciseThresholds } from '@/shared/types/exercise'

import type {
  IAnalyzerOutput,
  IFeedbackEvent,
  IPostureState,
} from '../types'

export const createInitialPostureState = (
  t: IExerciseThresholds,
): IPostureState => ({
  windowFlags: [],
  windowMaxLen: Math.max(30, Math.round(t.postureWindowSec * 30)),
  lastReminderAtMs: 0,
})

export const analyzePostureFrame = (
  lm: NormalizedLandmark[],
  prev: IPostureState,
  timestampMs: number,
  t: IExerciseThresholds,
): { state: IPostureState; out: IAnalyzerOutput } => {
  const quality = evaluateDeskPosture(lm, t)
  const isBad = quality === null ? false : quality.good === false

  const windowFlags = [...prev.windowFlags, isBad]
  const maxLen = prev.windowMaxLen
  while (windowFlags.length > maxLen) windowFlags.shift()

  const badCount = windowFlags.filter(Boolean).length
  const badFraction =
    windowFlags.length === 0 ? 0 : badCount / windowFlags.length

  const events: IFeedbackEvent[] = []
  const comments: string[] = []

  const intervalMs = t.postureReminderIntervalMin * 60_000
  const shouldRemind =
    badFraction >= t.postureBadFraction &&
    windowFlags.length >= maxLen * 0.85 &&
    timestampMs - prev.lastReminderAtMs >= intervalMs

  let lastReminderAtMs = prev.lastReminderAtMs
  if (shouldRemind) {
    lastReminderAtMs = timestampMs
    events.push({
      id: 'POSTURE_REMINDER',
      message:
        'Reset posture: level the head over the shoulders and relax both shoulders evenly.',
      severity: 'warning',
    })
    comments.push('Poor posture fraction high in the monitoring window.')
  }

  return {
    state: { windowFlags, windowMaxLen: maxLen, lastReminderAtMs },
    out: {
      hud: {
        phaseLabel: 'monitor',
        badFrameFraction: badFraction,
      },
      events,
      comments,
    },
  }
}
