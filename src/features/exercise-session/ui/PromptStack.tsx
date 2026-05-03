import { AnimatePresence, motion } from 'motion/react'

import type { IFeedbackEvent } from '@/features/exercise-session/model/types'
import { cn } from '@/shared/lib/cn'

export interface IPromptItem extends IFeedbackEvent {
  key: string
}

export interface IPromptStackProps {
  items: IPromptItem[]
}

export const PromptStack = ({ items }: IPromptStackProps) => {
  return (
    <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-40 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.key}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            role="status"
            className={cn(
              'pointer-events-auto max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur',
              item.severity === 'warning' &&
                'border-amber-500/40 bg-amber-950/80 text-amber-50',
              item.severity === 'success' &&
                'border-emerald-500/40 bg-emerald-950/80 text-emerald-50',
              item.severity === 'info' &&
                'border-border bg-background/90 text-foreground',
            )}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
