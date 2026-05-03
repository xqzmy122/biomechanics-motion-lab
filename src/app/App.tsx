import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { router } from '@/app/router'
import { ThemeProvider } from '@/app/providers/ThemeProvider'

export const App = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  )
}
