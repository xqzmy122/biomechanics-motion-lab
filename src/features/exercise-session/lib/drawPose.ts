import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/** BlazePose topology subset for drawing */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [15, 17],
  [15, 19],
  [15, 21],
  [16, 18],
  [16, 20],
  [16, 22],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
]

export const drawPoseOnCanvas = (
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  mirror: boolean,
  width: number,
  height: number,
) => {
  const mapX = (x: number) => (mirror ? width - x * width : x * width)
  const mapY = (y: number) => y * height

  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(250, 250, 250, 0.85)'
  ctx.fillStyle = 'rgba(168, 85, 247, 0.95)'

  for (const [a, b] of EDGES) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(mapX(la.x), mapY(la.y))
    ctx.lineTo(mapX(lb.x), mapY(lb.y))
    ctx.stroke()
  }

  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue
    const x = mapX(lm.x)
    const y = mapY(lm.y)
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}
