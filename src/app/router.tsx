import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ExerciseDetailPage } from '@/features/exercise-detail/ui/ExerciseDetailPage'
import { ExerciseSelectionPage } from '@/features/exercise-selection/ui/ExerciseSelectionPage'
import { ExerciseSessionPage } from '@/features/exercise-session/ui/ExerciseSessionPage'

export const router = createBrowserRouter([
  { path: '/', element: <ExerciseSelectionPage /> },
  { path: '/exercise/:exerciseId', element: <ExerciseDetailPage /> },
  { path: '/exercise/:exerciseId/session', element: <ExerciseSessionPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
