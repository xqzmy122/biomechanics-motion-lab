import { motion } from 'motion/react'
import { ArrowLeft, Play, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getExerciseById } from '@/shared/config/exercises'
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

export const ExerciseDetailPage = () => {
  const { exerciseId } = useParams()
  const navigate = useNavigate()

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

  const handleTrainingClick = () => {
    toast.message('Training mode', {
      description: 'Guided sets and pacing will land here soon.',
    })
  }

  const handleStartClick = () => {
    navigate(`/exercise/${exercise.id}/session`)
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
            <CardDescription>{exercise.cameraSetup}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle className="text-sm">Technique tutorial</AlertTitle>
              <AlertDescription>
                Video walkthrough is a mock for now — follow the on-screen cues
                during the live session. On the next screen you will tap Enable camera
                and allow access when the browser prompts you.
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
