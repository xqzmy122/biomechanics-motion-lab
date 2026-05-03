import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import type { IExerciseConfig } from '@/shared/types/exercise'
import { cn } from '@/shared/lib/cn'

export interface IExerciseCardProps {
  exercise: IExerciseConfig
  className?: string
}

export const ExerciseCard = ({ exercise, className }: IExerciseCardProps) => {
  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    >
      <Link
        to={`/exercise/${exercise.id}`}
        className={cn('block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl', className)}
        aria-label={`Open ${exercise.title}`}
      >
        <Card className="h-full border-border/80 bg-card/80 backdrop-blur transition-colors hover:border-primary/40">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">{exercise.title}</CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {exercise.summary}
              </CardDescription>
            </div>
            <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="pb-6" />
        </Card>
      </Link>
    </motion.div>
  )
}
