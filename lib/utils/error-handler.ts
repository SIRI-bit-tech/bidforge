/**
 * Client-side error handler that sanitizes backend errors
 * Prevents exposing sensitive system information to users
 */

export interface UserFriendlyError {
  message: string
  code?: string
}

// Map of backend error patterns to user-friendly messages
const ERROR_MAPPINGS: Record<string, string> = {
  // Network/Connection errors
  'Failed to fetch': 'Unable to connect to server. Please check your internet connection.',
  'NetworkError': 'Network connection failed. Please try again.',
  'fetch': 'Connection error. Please try again.',
  
  // JSON parsing errors
  'Unexpected end of JSON input': 'Server response error. Please try again.',
  'Unexpected token': 'Server response error. Please try again.',
  'JSON.parse': 'Server response error. Please try again.',
  'SyntaxError': 'Server response error. Please try again.',
  
  // Authentication errors
  'Invalid or expired token': 'Your session has expired. Please log in again.',
  'Authentication required': 'Please log in to continue.',
  'Unauthorized': 'Access denied. Please log in again.',
  'Token expired': 'Your session has expired. Please log in again.',
  'Invalid credentials': 'Invalid email or password.',
  
  // Registration errors
  'User already exists': 'An account with this email already exists.',
  'Email already registered': 'An account with this email already exists.',
  'Invalid email format': 'Please enter a valid email address.',
  'Password too weak': 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
  
  // Validation errors
  'Validation failed': 'Please check your input and try again.',
  'Invalid input': 'Please check your input and try again.',
  'Missing required field': 'Please fill in all required fields.',
  
  // Database errors
  'Database error': 'A temporary error occurred. Please try again.',
  'Connection timeout': 'Request timed out. Please try again.',
  'Internal server error': 'A temporary error occurred. Please try again.',
  
  // Rate limiting
  'Too many requests': 'Too many attempts. Please wait a moment and try again.',
  'Rate limit exceeded': 'Too many attempts. Please wait a moment and try again.',
  
  // File upload errors
  'File too large': 'File size exceeds the maximum limit.',
  'Invalid file type': 'File type not supported.',
  'Upload failed': 'File upload failed. Please try again.',
}

// Generic error messages by category
const GENERIC_ERRORS = {
  network: 'Connection error. Please check your internet and try again.',
  server: 'A temporary server error occurred. Please try again.',
  validation: 'Please check your input and try again.',
  authentication: 'Authentication failed. Please log in again.',
  permission: 'You do not have permission to perform this action.',
  notFound: 'The requested resource was not found.',
  default: 'An unexpected error occurred. Please try again.',
}

/**
 * Sanitizes backend errors into user-friendly messages
 * Prevents exposure of sensitive system information
 */
export function sanitizeError(error: any): UserFriendlyError {
  let errorMessage = ''
  let errorCode = ''

  // Extract error message from various error formats
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error?.message) {
    errorMessage = error.message
  } else if (error?.error) {
    errorMessage = error.error
  } else if (error?.data?.error) {
    errorMessage = error.data.error
  } else {
    errorMessage = 'Unknown error'
  }

  // Extract error code if available
  if (error?.code) {
    errorCode = error.code
  } else if (error?.status) {
    errorCode = error.status.toString()
  }

  // Check for exact matches first
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MAPPINGS)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        message: friendlyMessage,
        code: errorCode
      }
    }
  }

  // Check for HTTP status codes
  if (errorCode) {
    switch (errorCode) {
      case '400':
        return { message: GENERIC_ERRORS.validation, code: errorCode }
      case '401':
        return { message: GENERIC_ERRORS.authentication, code: errorCode }
      case '403':
        return { message: GENERIC_ERRORS.permission, code: errorCode }
      case '404':
        return { message: GENERIC_ERRORS.notFound, code: errorCode }
      case '429':
        return { message: 'Too many attempts. Please wait and try again.', code: errorCode }
      case '500':
      case '502':
      case '503':
      case '504':
        return { message: GENERIC_ERRORS.server, code: errorCode }
    }
  }

  // Categorize by error type patterns
  const lowerMessage = errorMessage.toLowerCase()
  
  if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
    return { message: GENERIC_ERRORS.network, code: errorCode }
  }
  
  if (lowerMessage.includes('json') || lowerMessage.includes('parse') || lowerMessage.includes('syntax')) {
    return { message: 'Server response error. Please try again.', code: errorCode }
  }
  
  if (lowerMessage.includes('auth') || lowerMessage.includes('token') || lowerMessage.includes('login')) {
    return { message: GENERIC_ERRORS.authentication, code: errorCode }
  }
  
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('access')) {
    return { message: GENERIC_ERRORS.permission, code: errorCode }
  }
  
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return { message: GENERIC_ERRORS.validation, code: errorCode }
  }

  // If no pattern matches, return generic error
  return {
    message: GENERIC_ERRORS.default,
    code: errorCode
  }
}

/**
 * Handles API response errors and returns sanitized error
 */
export async function handleApiError(response: Response): Promise<UserFriendlyError> {
  let errorData: any = {}
  
  try {
    // Try to parse JSON error response
    const text = await response.text()
    if (text) {
      errorData = JSON.parse(text)
    }
  } catch {
    // If JSON parsing fails, use generic error
    errorData = { error: 'Server response error' }
  }

  // Add HTTP status to error data
  errorData.status = response.status
  errorData.statusText = response.statusText

  return sanitizeError(errorData)
}

/**
 * Wrapper for fetch requests with automatic error sanitization
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const error = await handleApiError(response)
      throw new Error(error.message)
    }
    
    return response
  } catch (error) {
    // If it's already a sanitized error, re-throw it
    if (error instanceof Error) {
      const sanitized = sanitizeError(error)
      throw new Error(sanitized.message)
    }
    
    // Otherwise sanitize and throw
    const sanitized = sanitizeError(error)
    throw new Error(sanitized.message)
  }
}