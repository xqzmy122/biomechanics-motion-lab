import { useEffect, type ReactNode } from 'react'

export interface IThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: IThemeProviderProps) => {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return children
}
