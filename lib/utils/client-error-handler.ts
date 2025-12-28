/**
 * Client-side error handling utilities
 * Prevents sensitive information from being exposed in the browser
 */

import { sanitizeError } from './error-handler'

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const sanitized = sanitizeError(event.reason)
    
    // Log sanitized error
    console.error('Unhandled promise rejection:', sanitized.message)
    
    // Send to error reporting (optional)
    reportClientError('unhandled_rejection', sanitized.message, {
      stack: 'Promise rejection',
      url: window.location.href
    })
    
    // Prevent the default browser error handling
    event.preventDefault()
  })

  // Global error handler for uncaught exceptions
  window.addEventListener('error', (event) => {
    const sanitized = sanitizeError(event.error || event.message)
    
    // Log sanitized error
    console.error('Uncaught error:', sanitized.message)
    
    // Send to error reporting (optional)
    reportClientError('uncaught_error', sanitized.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href
    })
  })
}

/**
 * Report client-side errors to the server (sanitized)
 */
export async function reportClientError(
  type: string, 
  message: string, 
  context?: Record<string, any>
) {
  try {
    // Only send sanitized, non-sensitive information
    await fetch('/api/error-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'client_error',
        data: {
          message: message,
          type: type,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          context: context ? sanitizeContext(context) : undefined
        }
      })
    })
  } catch (error) {
    // If error reporting fails, just log locally
    console.error('Failed to report error to server:', message)
  }
}

/**
 * Sanitize context data to remove sensitive information
 */
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (key.toLowerCase().includes('password') || 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key')) {
      continue
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      // Truncate very long strings
      sanitized[key] = value.length > 200 ? value.substring(0, 200) + '...' : value
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize objects (but limit depth)
      sanitized[key] = sanitizeContext(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Wrapper for async functions to handle errors gracefully
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback?: R
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const sanitized = sanitizeError(error)
      
      // Log sanitized error
      console.error('Function error:', sanitized.message)
      
      // Report to server
      reportClientError('function_error', sanitized.message, {
        functionName: fn.name || 'anonymous',
        args: sanitizeContext({ args })
      })
      
      // Return fallback or re-throw sanitized error
      if (fallback !== undefined) {
        return fallback
      }
      
      throw new Error(sanitized.message)
    }
  }
}

/**
 * Safe fetch wrapper that sanitizes errors
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      let errorData: any = {}
      
      try {
        const text = await response.text()
        if (text) {
          errorData = JSON.parse(text)
        }
      } catch {
        errorData = { error: 'Server response error' }
      }
      
      const sanitized = sanitizeError(errorData.error || errorData)
      throw new Error(sanitized.message)
    }
    
    return response
  } catch (error) {
    const sanitized = sanitizeError(error)
    throw new Error(sanitized.message)
  }
}