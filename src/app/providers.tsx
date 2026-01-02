"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { SessionProvider } from "next-auth/react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(prefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("theme", theme)
      document.documentElement.className = theme
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light")
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <SessionProvider>{children}</SessionProvider>
    </ThemeContext.Provider>
  )
}
