export interface IPostureInterval {
  startSec: number
  endSec: number
  good: boolean
}

export const buildPostureIntervalsFromSamples = (
  samples: ReadonlyArray<{ tSec: number; good: boolean }>,
): IPostureInterval[] => {
  if (samples.length === 0) return []
  const sorted = [...samples].sort((a, b) => a.tSec - b.tSec)
  const out: IPostureInterval[] = []
  let curStart = sorted[0].tSec
  let curEnd = sorted[0].tSec
  let curGood = sorted[0].good

  for (let i = 1; i < sorted.length; i++) {
    const row = sorted[i]
    if (row.good === curGood) {
      curEnd = row.tSec
    } else {
      out.push({
        startSec: curStart,
        endSec: curEnd,
        good: curGood,
      })
      curStart = row.tSec
      curEnd = row.tSec
      curGood = row.good
    }
  }
  out.push({ startSec: curStart, endSec: curEnd, good: curGood })
  return out
}
