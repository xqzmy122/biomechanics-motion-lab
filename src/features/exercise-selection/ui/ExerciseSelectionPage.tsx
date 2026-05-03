import { motion } from 'motion/react'
import { Activity } from 'lucide-react'

import { EXERCISES } from '@/shared/config/exercises'
import { ExerciseCard } from '@/features/exercise-selection/ui/ExerciseCard'

export const ExerciseSelectionPage = () => {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-10 px-4 py-12">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Activity className="size-3.5" aria-hidden />
          <span>biolab · movement check</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Choose an exercise
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Side or front camera placement matters. Pick a drill to see setup notes
          before you start.
        </p>
      </motion.header>

      <motion.ul
        className="grid gap-4 sm:grid-cols-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.06 },
          },
        }}
      >
        {EXERCISES.map((exercise) => (
          <motion.li
            key={exercise.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.22 }}
          >
            <ExerciseCard exercise={exercise} />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}
