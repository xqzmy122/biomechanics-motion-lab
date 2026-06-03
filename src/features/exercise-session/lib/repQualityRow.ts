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
  'KNEE_VALGUS',
  'TORSO_SHIFT',
  'BODY_LINE_BREAK',
  'ELBOW_FLARE',
])

const FEEDBACK_LABEL: Record<IFeedbackEventId, string> = {
  KNEE_OVER_TOE: 'Knee over toes',
  TORSO_LEAN: 'Torso lean',
  DEPTH_OK: 'Depth OK',
  DEPTH_SHALLOW: 'Shallow depth',
  KNEE_VALGUS: 'Knee valgus',
  TORSO_SHIFT: 'Torso shift',
  BODY_LINE_BREAK: 'Hips off line',
  ELBOW_FLARE: 'Elbow flare',
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

export const pickPostRepPrompt = (
  feedbackById: ReadonlyMap<IFeedbackEventId, string>,
): { id: IFeedbackEventId; message: string; severity: 'info' | 'warning' | 'success' } | null => {
  const events = [...feedbackById.entries()].map(([id, message]) => ({
    id,
    message,
    severity: (POSITIVE_IDS.has(id) ? 'success' : 'warning') as 'info' | 'warning' | 'success',
  }))

  if (events.length === 0) return null

  const severityRank = (s: 'info' | 'warning' | 'success') =>
    s === 'warning' ? 0 : s === 'info' ? 1 : 2

  const sorted = [...events].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  )

  return sorted.find((e) => e.severity !== 'success') ?? null
}
