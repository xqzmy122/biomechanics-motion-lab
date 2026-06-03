import { motion } from 'motion/react'
import { ArrowLeft, Camera, Play, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getExerciseById } from '@/shared/config/exercises'
import type { ISquatCameraView } from '@/shared/types/exercise'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/cn'

const SQUAT_VIEW_OPTIONS: Array<{
  id: ISquatCameraView
  label: string
  description: string
}> = [
  {
    id: 'side',
    label: 'Side view',
    description: 'Depth, knee-over-toe, forward torso lean',
  },
  {
    id: 'front',
    label: 'Front view',
    description: 'Knee valgus and lateral torso shift (uses front camera on phones)',
  },
]

export const ExerciseDetailPage = () => {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [squatView, setSquatView] = useState<ISquatCameraView>('side')

  const exercise = useMemo(() => {
    if (!exerciseId) return undefined
    return getExerciseById(exerciseId)
  }, [exerciseId])

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

  const isSquat = exercise.id === 'squat'
  const activeCameraSetup =
    isSquat && squatView === 'front' && exercise.cameraSetupFront
      ? exercise.cameraSetupFront
      : exercise.cameraSetup

  const handleTrainingClick = () => {
    toast.message('Training mode', {
      description: 'Guided sets and pacing will land here soon.',
    })
  }

  const handleStartClick = () => {
    const params = isSquat ? `?view=${squatView}` : ''
    navigate(`/exercise/${exercise.id}/session${params}`)
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex flex-col gap-4"
      >
        <Button variant="ghost" className="w-fit gap-2 px-2" asChild>
          <Link to="/" aria-label="Back to exercise list">
            <ArrowLeft className="size-4" />
            Exercises
          </Link>
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{exercise.title}</h1>
          <p className="text-sm text-muted-foreground">{exercise.summary}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Camera setup</CardTitle>
            <CardDescription>{activeCameraSetup}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSquat ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Camera angle</p>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Squat camera angle"
                >
                  {SQUAT_VIEW_OPTIONS.map((option) => {
                    const selected = squatView === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={0}
                        onClick={() => setSquatView(option.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSquatView(option.id)
                          }
                        }}
                        className={cn(
                          'rounded-lg border p-3 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Camera className="size-4 shrink-0" aria-hidden />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <Alert>
              <AlertTitle className="text-sm">Technique tutorial</AlertTitle>
              <AlertDescription>
                Video walkthrough is a mock for now — follow the on-screen cues
                during the live session. Camera access is requested automatically
                if you already allowed it in this browser session.
              </AlertDescription>
            </Alert>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="gap-2"
                onClick={handleStartClick}
              >
                <Play className="size-4" aria-hidden />
                Start
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="gap-2"
                onClick={handleTrainingClick}
              >
                <Sparkles className="size-4" aria-hidden />
                Training
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
