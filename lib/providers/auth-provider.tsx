"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

interface AuthContextType {
  isLoading: boolean
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isInitialized: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const { restoreSession } = useStore()
  const pathname = usePathname()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Skip session restoration on admin pages
        if (pathname?.startsWith('/admin')) {
          setIsLoading(false)
          setIsInitialized(true)
          return
        }
        
        await restoreSession()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to restore session:', error)
        }
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [restoreSession, pathname])

  return (
    <AuthContext.Provider value={{ isLoading, isInitialized }}>
      {children}
    </AuthContext.Provider>
  )
}