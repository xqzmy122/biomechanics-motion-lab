import { motion } from 'motion/react'
import { ArrowLeft, Loader2, Square, SwitchCamera, Video } from 'lucide-react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { drawPoseOnCanvas } from '@/features/exercise-session/lib/drawPose'
import {
  isCalibrationPoseOk,
  isCalibrationVisible,
} from '@/features/exercise-session/lib/calibration'
import {
  buildRepQualityRow,
  pickPostRepPrompt,
  type IRepQualityRow,
} from '@/features/exercise-session/lib/repQualityRow'
import { smoothLandmarks } from '@/features/exercise-session/lib/smoothing'
import {
  analyzePushupFrame,
  createInitialPushupState,
} from '@/features/exercise-session/model/analyzers/pushupAnalyzer'
import {
  analyzeSquatFrontFrame,
  createInitialSquatFrontState,
} from '@/features/exercise-session/model/analyzers/squatFrontAnalyzer'
import {
  analyzeSquatFrame,
  createInitialSquatState,
} from '@/features/exercise-session/model/analyzers/squatAnalyzer'
import {
  SESSION_CALIBRATION_HOLD_MS,
  SESSION_COUNTDOWN_MS,
} from '@/features/exercise-session/model/sessionConstants'
import type {
  IFeedbackEvent,
  IFeedbackEventId,
  ISessionHud,
  ISquatFrontState,
  ISquatState,
} from '@/features/exercise-session/model/types'
import { useCameraStream } from '@/features/exercise-session/model/useCameraStream'
import { usePoseLandmarker } from '@/features/exercise-session/model/usePoseLandmarker'
import type { IPromptItem } from '@/features/exercise-session/ui/PromptStack'
import { PromptStack } from '@/features/exercise-session/ui/PromptStack'
import {
  SessionSummaryDialog,
  type ISessionSummary,
} from '@/features/exercise-session/ui/SessionSummaryDialog'
import { getExerciseById } from '@/shared/config/exercises'
import type { ISquatCameraView } from '@/shared/types/exercise'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'

type ISessionPhase = 'countdown' | 'calibrating' | 'active'

const parseSquatView = (value: string | null): ISquatCameraView =>
  value === 'front' ? 'front' : 'side'

const buildInitialHud = (): ISessionHud => ({
  reps: 0,
  phaseLabel: 'prep',
  kneeAngleDeg: null,
  elbowAngleDeg: null,
  torsoLeanDeg: null,
  bodyLineDevDeg: null,
  torsoShiftNorm: null,
  hipDropNorm: null,
  runtimeSec: 0,
})

export const ExerciseSessionPage = () => {
  const { exerciseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const squatView = parseSquatView(searchParams.get('view'))

  const exercise = useMemo(() => {
    if (!exerciseId) return undefined
    return getExerciseById(exerciseId)
  }, [exerciseId])

  const facingPreference =
    exercise?.analyzerKind === 'squat' && squatView === 'front'
      ? 'user'
      : 'environment'

  const {
    stream,
    error: cameraError,
    facingUser,
    isRequesting: isCameraRequesting,
    canUseCamera,
    hasFrontCamera,
    canSwitchCamera,
    requestCamera,
    switchToFrontCamera,
    toggleCamera,
  } = useCameraStream({ initialFacing: facingPreference })
  const { ready: poseReady, error: poseError, detectForVideo } =
    usePoseLandmarker()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smoothedRef = useRef<NormalizedLandmark[] | null>(null)
  const squatStateRef = useRef<ISquatState | ISquatFrontState>(createInitialSquatState())
  const pushupStateRef = useRef(createInitialPushupState())
  const lastRepsRef = useRef(0)
  const lastHudPushRef = useRef(0)
  const workoutStartRef = useRef<number | null>(null)
  const commentsRef = useRef(new Set<string>())
  const repFeedbackByIdRef = useRef(new Map<IFeedbackEventId, string>())
  const repQualityRowsRef = useRef<IRepQualityRow[]>([])
  const rvcHandleRef = useRef<number>(0)
  const loopActiveRef = useRef(false)
  const hudRef = useRef<ISessionHud>(buildInitialHud())

  const sessionPhaseRef = useRef<ISessionPhase>('countdown')
  const countdownStartRef = useRef<number | null>(null)
  const calibrationHoldMsRef = useRef(0)
  const lastFrameTsRef = useRef<number | null>(null)
  const lastCountdownIntRef = useRef(-1)
  const lastCalibUiRef = useRef(-1)
  const finalizeSessionRef = useRef<() => void>(() => {})

  const [replayTick, setReplayTick] = useState(0)
  const [hud, setHud] = useState<ISessionHud>(buildInitialHud)
  const [prompts, setPrompts] = useState<IPromptItem[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState<ISessionSummary | null>(null)
  const [sessionPhase, setSessionPhase] = useState<ISessionPhase>('countdown')
  const [countdownSec, setCountdownSec] = useState(10)
  const [calibrationProgress, setCalibrationProgress] = useState(0)

  const pushPrompt = useCallback((ev: IPromptItem) => {
    setPrompts((prev) => [...prev.slice(-3), ev])
    window.setTimeout(() => {
      setPrompts((prev) => prev.filter((p) => p.key !== ev.key))
    }, 3200)
  }, [])

  useEffect(() => {
    if (!exercise) return
    squatStateRef.current =
      exercise.analyzerKind === 'squat' && squatView === 'front'
        ? createInitialSquatFrontState()
        : createInitialSquatState()
    pushupStateRef.current = createInitialPushupState()
    smoothedRef.current = null
    lastRepsRef.current = 0
    workoutStartRef.current = null
    commentsRef.current = new Set()
    repFeedbackByIdRef.current.clear()
    repQualityRowsRef.current = []
    const nextHud = buildInitialHud()
    hudRef.current = nextHud
    queueMicrotask(() => {
      setHud(nextHud)
      setPrompts([])
    })
  }, [exercise, squatView, replayTick])

  useEffect(() => {
    if (!stream || !poseReady || !exercise) return
    sessionPhaseRef.current = 'countdown'
    countdownStartRef.current = null
    calibrationHoldMsRef.current = 0
    lastFrameTsRef.current = null
    lastCountdownIntRef.current = -1
    lastCalibUiRef.current = -1
    workoutStartRef.current = null
    repQualityRowsRef.current = []
    repFeedbackByIdRef.current.clear()
    queueMicrotask(() => {
      setSessionPhase('countdown')
      setCountdownSec(10)
      setCalibrationProgress(0)
    })
  }, [stream, poseReady, exercise, squatView, replayTick])

  const finalizeSession = useCallback(() => {
    if (!exercise) return
    loopActiveRef.current = false
    const video = videoRef.current
    if (video) {
      video.cancelVideoFrameCallback(rvcHandleRef.current)
    }

    const end = performance.now()
    const ws = workoutStartRef.current
    const rawDurationSec = ws === null ? 0 : Math.max(0, (end - ws) / 1000)

    if (repFeedbackByIdRef.current.size > 0) {
      const incompleteRep =
        exercise.analyzerKind === 'squat'
          ? squatStateRef.current.reps + 1
          : pushupStateRef.current.reps + 1
      repQualityRowsRef.current.push(
        buildRepQualityRow(incompleteRep, repFeedbackByIdRef.current),
      )
      repFeedbackByIdRef.current.clear()
    }

    setSummary({
      exerciseTitle: exercise.title,
      durationSec: rawDurationSec,
      reps: hudRef.current.reps,
      repQualityRows:
        repQualityRowsRef.current.length > 0
          ? [...repQualityRowsRef.current]
          : null,
      comments: [...commentsRef.current],
    })
    setSummaryOpen(true)
  }, [exercise])

  useEffect(() => {
    finalizeSessionRef.current = finalizeSession
  }, [finalizeSession])

  useEffect(() => {
    if (!exercise || !stream || !poseReady) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    void video.play()

    loopActiveRef.current = true
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return () => {
        loopActiveRef.current = false
      }
    }

    const handleFrame = () => {
      if (!loopActiveRef.current) return
      if (video.readyState < 2) {
        rvcHandleRef.current = video.requestVideoFrameCallback(handleFrame)
        return
      }

      const detectTs = performance.now()
      const lastTs = lastFrameTsRef.current ?? detectTs
      const deltaMs = Math.min(80, Math.max(0, detectTs - lastTs))
      lastFrameTsRef.current = detectTs

      const result = detectForVideo(video, detectTs)
      const raw = result?.landmarks?.[0]

      if (raw && exercise) {
        const alpha = exercise.thresholds.smoothingAlpha
        smoothedRef.current = smoothLandmarks(smoothedRef.current, raw, alpha)
        const lm = smoothedRef.current

        const phase = sessionPhaseRef.current
        const squatCameraView =
          exercise.analyzerKind === 'squat' ? squatView : 'side'

        if (phase === 'countdown') {
          if (countdownStartRef.current === null) {
            countdownStartRef.current = detectTs
          }
          const elapsed = detectTs - countdownStartRef.current
          if (elapsed >= SESSION_COUNTDOWN_MS) {
            sessionPhaseRef.current = 'calibrating'
            setSessionPhase('calibrating')
            calibrationHoldMsRef.current = 0
            countdownStartRef.current = null
            lastCountdownIntRef.current = -1
          } else {
            const secLeft = Math.max(
              0,
              Math.ceil((SESSION_COUNTDOWN_MS - elapsed) / 1000),
            )
            if (secLeft !== lastCountdownIntRef.current) {
              lastCountdownIntRef.current = secLeft
              setCountdownSec(secLeft)
            }
          }
        } else if (phase === 'calibrating') {
          const visible = isCalibrationVisible(
            exercise.analyzerKind,
            lm,
            squatCameraView,
          )
          const poseOk = isCalibrationPoseOk(
            exercise.analyzerKind,
            lm,
            exercise.thresholds,
            squatCameraView,
          )
          if (visible && poseOk) {
            calibrationHoldMsRef.current += deltaMs
          } else {
            calibrationHoldMsRef.current = 0
          }
          const pct = Math.min(
            100,
            Math.round(
              (calibrationHoldMsRef.current / SESSION_CALIBRATION_HOLD_MS) * 100,
            ),
          )
          if (Math.abs(pct - lastCalibUiRef.current) >= 2) {
            lastCalibUiRef.current = pct
            setCalibrationProgress(pct)
          }
          if (calibrationHoldMsRef.current >= SESSION_CALIBRATION_HOLD_MS) {
            sessionPhaseRef.current = 'active'
            setSessionPhase('active')
            workoutStartRef.current = detectTs
            squatStateRef.current =
              squatCameraView === 'front'
                ? createInitialSquatFrontState()
                : createInitialSquatState()
            pushupStateRef.current = createInitialPushupState()
            lastRepsRef.current = 0
            calibrationHoldMsRef.current = 0
            lastCalibUiRef.current = -1
            repQualityRowsRef.current = []
            repFeedbackByIdRef.current.clear()
            setCalibrationProgress(100)
          }
        } else if (phase === 'active') {
          const ws = workoutStartRef.current ?? detectTs
          const runtimeSec = (detectTs - ws) / 1000

          const events: IFeedbackEvent[] = []
          const comments: string[] = []

          const repsBefore =
            exercise.analyzerKind === 'squat'
              ? squatStateRef.current.reps
              : pushupStateRef.current.reps

          let outPartial: Partial<ISessionHud>
          if (exercise.analyzerKind === 'squat') {
            if (squatCameraView === 'front') {
              const { state, out } = analyzeSquatFrontFrame(
                lm,
                squatStateRef.current as ISquatFrontState,
                exercise.thresholds,
              )
              squatStateRef.current = state
              outPartial = out.hud
              events.push(...out.events)
              comments.push(...out.comments)
            } else {
              const { state, out } = analyzeSquatFrame(
                lm,
                squatStateRef.current as ISquatState,
                exercise.thresholds,
              )
              squatStateRef.current = state
              outPartial = out.hud
              events.push(...out.events)
              comments.push(...out.comments)
            }
          } else {
            const { state, out } = analyzePushupFrame(
              lm,
              pushupStateRef.current,
              exercise.thresholds,
            )
            pushupStateRef.current = state
            outPartial = out.hud
            events.push(...out.events)
            comments.push(...out.comments)
          }

          for (const c of comments) {
            commentsRef.current.add(c)
          }

          for (const ev of events) {
            repFeedbackByIdRef.current.set(ev.id, ev.message)
          }

          const repsAfter =
            exercise.analyzerKind === 'squat'
              ? squatStateRef.current.reps
              : pushupStateRef.current.reps

          if (repsAfter > repsBefore) {
            const completedFeedback = new Map(repFeedbackByIdRef.current)
            repQualityRowsRef.current.push(
              buildRepQualityRow(repsAfter, completedFeedback),
            )

            const postRepPrompt = pickPostRepPrompt(completedFeedback)
            if (postRepPrompt) {
              const key = `${postRepPrompt.id}-rep-${repsAfter}`
              pushPrompt({ ...postRepPrompt, key })
            }

            repFeedbackByIdRef.current.clear()
          }

          const reps =
            exercise.analyzerKind === 'squat'
              ? squatStateRef.current.reps
              : pushupStateRef.current.reps

          const nextHud: ISessionHud = {
            reps,
            phaseLabel: outPartial.phaseLabel ?? '—',
            kneeAngleDeg: outPartial.kneeAngleDeg ?? null,
            elbowAngleDeg: outPartial.elbowAngleDeg ?? null,
            torsoLeanDeg: outPartial.torsoLeanDeg ?? null,
            bodyLineDevDeg: outPartial.bodyLineDevDeg ?? null,
              torsoShiftNorm: outPartial.torsoShiftNorm ?? null,
              hipDropNorm: outPartial.hipDropNorm ?? null,
              runtimeSec,
          }

          hudRef.current = nextHud

          const repsChanged = nextHud.reps !== lastRepsRef.current
          if (repsChanged) {
            lastRepsRef.current = nextHud.reps
          }

          const shouldPushHud =
            repsChanged || detectTs - lastHudPushRef.current > 90
          if (shouldPushHud) {
            lastHudPushRef.current = detectTs
            setHud(nextHud)
          }
        }
      }

      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (facingUser) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()

      const lmDraw = smoothedRef.current
      if (lmDraw) {
        drawPoseOnCanvas(ctx, lmDraw, facingUser, canvas.width, canvas.height)
      }

      rvcHandleRef.current = video.requestVideoFrameCallback(handleFrame)
    }

    rvcHandleRef.current = video.requestVideoFrameCallback(handleFrame)

    return () => {
      loopActiveRef.current = false
      video.cancelVideoFrameCallback(rvcHandleRef.current)
      smoothedRef.current = null
    }
  }, [
    exercise,
    stream,
    poseReady,
    facingUser,
    squatView,
    detectForVideo,
    pushPrompt,
    replayTick,
  ])

  const handleStop = () => {
    finalizeSession()
  }

  const handleDone = () => {
    setSummaryOpen(false)
    navigate('/')
  }

  const handleReplay = () => {
    setSummaryOpen(false)
    setReplayTick((t) => t + 1)
  }

  if (!exercise) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">Exercise not found.</p>
        <Button asChild variant="secondary">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    )
  }

  const isInsecure =
    typeof window !== 'undefined' && !window.isSecureContext
  const showPoseError = Boolean(stream && poseError)
  const showPoseLoading = Boolean(stream && !poseReady && !poseError)
  const showCameraGate = !isInsecure && canUseCamera && !stream && !isCameraRequesting
  const showCameraUnsupported =
    !isInsecure && !canUseCamera && typeof window !== 'undefined'

  const handleEnableCameraClick = () => {
    void requestCamera()
  }

  const handleSwitchCameraClick = () => {
    if (facingUser) {
      void toggleCamera()
      return
    }
    if (hasFrontCamera) {
      void switchToFrontCamera()
      return
    }
    void toggleCamera()
  }

  const showCameraSwitch =
    Boolean(stream) &&
    canSwitchCamera &&
    sessionPhase !== 'countdown'

  const blockingOverlay =
    isInsecure ||
    showCameraUnsupported ||
    showCameraGate ||
    showPoseLoading ||
    showPoseError

  const prepBanner =
    stream &&
    poseReady &&
    (sessionPhase === 'countdown' || sessionPhase === 'calibrating')

  const showHudTimer = sessionPhase === 'active'
  const isSquatFront =
    exercise.analyzerKind === 'squat' && squatView === 'front'

  return (
    <div className="relative min-h-svh bg-black text-foreground">
      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="block h-svh w-full object-cover"
        aria-label="Camera preview with pose overlay"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent pb-16 pt-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-start justify-between gap-3 px-4">
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link
              to={`/exercise/${exercise.id}`}
              aria-label="Back to exercise"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {showCameraSwitch ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={handleSwitchCameraClick}
                disabled={isCameraRequesting}
                aria-label={
                  facingUser
                    ? 'Switch to back camera'
                    : 'Switch to front camera'
                }
              >
                <SwitchCamera className="size-4" aria-hidden />
                {facingUser ? 'Back cam' : 'Front cam'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleStop}
            >
              <Square className="size-3.5 fill-current" aria-hidden />
              Stop
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2 px-4"
        >
          <Badge variant="secondary" className="backdrop-blur">
            {exercise.title}
          </Badge>
          {exercise.analyzerKind === 'squat' ? (
            <Badge variant="outline" className="border-white/20 bg-black/40 text-white backdrop-blur">
              {isSquatFront ? 'Front view' : 'Side view'}
            </Badge>
          ) : null}
          <Badge variant="outline" className="border-white/20 bg-black/40 text-white backdrop-blur">
            {showHudTimer ? (
              <>
                {Math.floor(hud.runtimeSec / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor(hud.runtimeSec % 60)
                  .toString()
                  .padStart(2, '0')}
              </>
            ) : (
              <span className="text-white/70">00:00</span>
            )}
          </Badge>
          <Badge className="bg-white/90 text-black backdrop-blur">
            Reps: {sessionPhase === 'active' ? hud.reps : 0}
          </Badge>
          <Badge variant="outline" className="border-white/20 bg-black/40 capitalize text-white backdrop-blur">
            {(() => {
              if (sessionPhase === 'countdown') return 'get ready'
              if (sessionPhase === 'calibrating') return 'lock pose'
              return hud.phaseLabel
            })()}
          </Badge>
        </motion.div>
      </div>

      {prepBanner ? (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto w-full max-w-md"
          >
            <Card className="border-white/20 bg-zinc-950/90 text-white shadow-xl backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Get into position</CardTitle>
                <CardDescription className="text-zinc-300">
                  {sessionPhase === 'countdown'
                    ? 'Use this time to step into frame and match the camera setup for this exercise.'
                    : 'Hold your start pose steadily. If you step out of frame or break form, the bar resets.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessionPhase === 'countdown' ? (
                  <>
                    <p
                      className="text-center text-5xl font-semibold tabular-nums tracking-tight"
                      aria-live="polite"
                    >
                      {countdownSec}
                      <span className="text-lg font-normal text-zinc-400">s</span>
                    </p>
                    <Progress
                      value={Math.round(
                        ((SESSION_COUNTDOWN_MS / 1000 - countdownSec) /
                          (SESSION_COUNTDOWN_MS / 1000)) *
                          100,
                      )}
                      className="h-2 border border-white/10 bg-black/40"
                      aria-label="Countdown progress"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-center text-sm text-zinc-300">
                      Locking start pose…
                    </p>
                    <Progress
                      value={calibrationProgress}
                      className="h-2 border border-white/10 bg-black/40"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : null}

      {blockingOverlay ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="pointer-events-auto w-full max-w-md space-y-4">
            {isInsecure ? (
              <Card className="border-white/15 bg-zinc-950/95 text-white shadow-xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">Secure connection required</CardTitle>
                  <CardDescription className="text-zinc-300">
                    The camera only works on HTTPS or at http://localhost. Open the
                    dev server URL the tool printed (usually localhost), not a raw LAN
                    IP over plain HTTP.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {showCameraUnsupported ? (
              <Card className="border-white/15 bg-zinc-950/95 text-white shadow-xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">Camera not available</CardTitle>
                  <CardDescription className="text-zinc-300">
                    This browser does not expose a camera API, or the page is not in a
                    secure context.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {showCameraGate ? (
              <Card className="border-white/15 bg-zinc-950/95 text-white shadow-xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="size-5 shrink-0" aria-hidden />
                    Allow camera to start
                  </CardTitle>
                  <CardDescription className="text-zinc-300">
                    Tap the button below. When the browser asks for permission, choose
                    Allow so pose tracking can run. Video stays on your device; nothing
                    is uploaded.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cameraError ? (
                    <Alert variant="destructive" className="border-red-500/40 bg-red-950/50">
                      <AlertTitle className="text-sm">Could not start camera</AlertTitle>
                      <AlertDescription className="text-xs">
                        {cameraError}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <Button
                    type="button"
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleEnableCameraClick}
                    disabled={isCameraRequesting}
                  >
                    {isCameraRequesting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Waiting for camera…
                      </>
                    ) : (
                      <>
                        <Video className="size-4" aria-hidden />
                        Enable camera
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {isCameraRequesting && !showCameraGate ? (
              <div className="flex flex-col items-center gap-3 text-center text-sm text-white">
                <Loader2 className="size-8 animate-spin" aria-hidden />
                <p>Starting camera…</p>
              </div>
            ) : null}

            {showPoseError ? (
              <Card className="border-white/15 bg-zinc-950/95 text-white shadow-xl backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">Pose model failed</CardTitle>
                  <CardDescription className="text-zinc-300">
                    {poseError}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {showPoseLoading ? (
              <div className="flex flex-col items-center gap-3 text-center text-sm text-white">
                <Loader2 className="size-8 animate-spin" aria-hidden />
                <p>Loading pose model…</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-28 mx-auto max-w-xl px-4 text-center text-sm text-white/90 drop-shadow-md">
        {exercise.analyzerKind === 'squat' && sessionPhase === 'active' ? (
          <p>
            {isSquatFront ? (
              <>
                Hip drop:{' '}
                <span className="font-mono tabular-nums">
                  {hud.hipDropNorm === null
                    ? '—'
                    : `${Math.round(hud.hipDropNorm * 100)}%`}
                </span>
                {' · '}
                Thigh angle:{' '}
                <span className="font-mono tabular-nums">
                  {hud.kneeAngleDeg === null
                    ? '—'
                    : `${Math.round(hud.kneeAngleDeg)}°`}
                </span>
                {' · '}
                Torso shift:{' '}
                <span className="font-mono tabular-nums">
                  {hud.torsoShiftNorm === null
                    ? '—'
                    : `${(hud.torsoShiftNorm * 100).toFixed(0)}%`}
                </span>
              </>
            ) : (
              <>
                Knee angle:{' '}
                <span className="font-mono tabular-nums">
                  {hud.kneeAngleDeg === null ? '—' : `${Math.round(hud.kneeAngleDeg)}°`}
                </span>
                {' · '}
                Torso vs vertical:{' '}
                <span className="font-mono tabular-nums">
                  {hud.torsoLeanDeg === null ? '—' : `${Math.round(hud.torsoLeanDeg)}°`}
                </span>
              </>
            )}
          </p>
        ) : null}
        {exercise.analyzerKind === 'pushup' && sessionPhase === 'active' ? (
          <p>
            Elbow:{' '}
            <span className="font-mono tabular-nums">
              {hud.elbowAngleDeg === null ? '—' : `${Math.round(hud.elbowAngleDeg)}°`}
            </span>
            {' · '}
            Body line deviation:{' '}
            <span className="font-mono tabular-nums">
              {hud.bodyLineDevDeg === null ? '—' : `${Math.round(hud.bodyLineDevDeg)}°`}
            </span>
          </p>
        ) : null}
      </div>

      <PromptStack items={prompts} />

      {summary ? (
        <SessionSummaryDialog
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          summary={summary}
          onDone={handleDone}
          onReplay={handleReplay}
        />
      ) : null}
    </div>
  )
}
