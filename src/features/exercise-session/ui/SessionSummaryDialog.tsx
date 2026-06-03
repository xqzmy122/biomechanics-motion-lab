import type { IRepQualityRow } from '@/features/exercise-session/lib/repQualityRow'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'

export interface ISessionSummary {
  exerciseTitle: string
  durationSec: number
  reps: number | null
  repQualityRows: IRepQualityRow[] | null
  comments: string[]
}

export interface ISessionSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ISessionSummary
  onDone: () => void
  onReplay: () => void
}

export const SessionSummaryDialog = ({
  open,
  onOpenChange,
  summary,
  onDone,
  onReplay,
}: ISessionSummaryDialogProps) => {
  const minutes = Math.floor(summary.durationSec / 60)
  const seconds = Math.round(summary.durationSec % 60)
  const timeLabel =
    minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>Session summary</DialogTitle>
          <DialogDescription>
            {summary.exerciseTitle} · {timeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {summary.reps !== null ? (
            <p>
              <span className="text-muted-foreground">Repetitions: </span>
              <span className="font-medium tabular-nums">{summary.reps}</span>
            </p>
          ) : null}
          {summary.repQualityRows !== null && summary.repQualityRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rep quality
              </p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-2 py-2 font-medium">Rep</th>
                      <th className="px-2 py-2 font-medium">Good / comments</th>
                      <th className="px-2 py-2 font-medium">Bad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.repQualityRows.map((row) => (
                      <tr key={row.rep} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 font-mono tabular-nums">{row.rep}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.goodNotes}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.badNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Outcome: good = no issues flagged; mixed = positives and issues; bad = issues only.
              </p>
            </div>
          ) : null}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            {summary.comments.length === 0 ? (
              <p className="text-muted-foreground">No issues flagged this run.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {summary.comments.map((c, i) => (
                  <li key={`${i}-${c}`}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={onReplay}>
            Replay
          </Button>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
