import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH = '/models/pose_landmarker_lite.task'

export interface IUsePoseLandmarkerResult {
  ready: boolean
  error: string | null
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => PoseLandmarkerResult | null
}

export const usePoseLandmarker = (): IUsePoseLandmarkerResult => {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import(
          '@mediapipe/tasks-vision'
        )
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
        if (cancelled) return
        let landmarker: PoseLandmarker | null = null
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          })
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          })
        }
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setReady(true)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Pose model failed to load.')
      }
    }

    void load()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      setReady(false)
    }
  }, [])

  const detectForVideo = useCallback(
    (video: HTMLVideoElement, timestampMs: number) => {
      const lm = landmarkerRef.current
      if (!lm) return null
      return lm.detectForVideo(video, timestampMs)
    },
    [],
  )

  return { ready, error, detectForVideo }
}
