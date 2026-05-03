import type { IFeedbackEventId } from '@/features/exercise-session/model/types'

export interface IRepQualityRow {
  rep: number
  outcome: 'good' | 'mixed' | 'bad'
  goodNotes: string
  badNotes: string
}

const POSITIVE_IDS: ReadonlySet<IFeedbackEventId> = new Set(['DEPTH_OK'])

const NEGATIVE_IDS: ReadonlySet<IFeedbackEventId> = new Set([
  'KNEE_OVER_TOE',
  'TORSO_LEAN',
  'DEPTH_SHALLOW',
  'BODY_LINE_BREAK',
  'ELBOW_FLARE',
])

const FEEDBACK_LABEL: Record<IFeedbackEventId, string> = {
  KNEE_OVER_TOE: 'Knee over toes',
  TORSO_LEAN: 'Torso lean',
  DEPTH_OK: 'Depth OK',
  DEPTH_SHALLOW: 'Shallow depth',
  BODY_LINE_BREAK: 'Hips off line',
  ELBOW_FLARE: 'Elbow flare',
  POSTURE_REMINDER: 'Posture reminder',
}

export const buildRepQualityRow = (
  rep: number,
  feedbackById: ReadonlyMap<IFeedbackEventId, string>,
): IRepQualityRow => {
  const goodLabels: string[] = []
  const badLabels: string[] = []

  for (const id of feedbackById.keys()) {
    const label = FEEDBACK_LABEL[id] ?? id
    if (POSITIVE_IDS.has(id)) goodLabels.push(label)
    else if (NEGATIVE_IDS.has(id)) badLabels.push(label)
  }

  let outcome: IRepQualityRow['outcome']
  if (badLabels.length === 0) {
    outcome = 'good'
  } else if (goodLabels.length === 0) {
    outcome = 'bad'
  } else {
    outcome = 'mixed'
  }

  return {
    rep,
    outcome,
    goodNotes: goodLabels.length ? goodLabels.join(', ') : '—',
    badNotes: badLabels.length ? badLabels.join(', ') : '—',
  }
}
