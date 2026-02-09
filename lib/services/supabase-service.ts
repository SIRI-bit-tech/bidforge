import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { WaitlistEntry } from '@/lib/types'

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

// Initialize Supabase client only if environment variables are available
let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
  }
} else {
  console.warn('Supabase environment variables not found. Waitlist features will be disabled.')
}

// Service-specific interface for Supabase data
interface SupabaseWaitlistEntry {
  id: string
  email: string
  created_at: string
  status?: string
  name?: string
  converted_at?: string
}

/**
 * Supabase Waitlist Service
 * Connects to external Supabase waitlist database
 */
export class SupabaseWaitlistService {
  /**
   * Check if Supabase is configured
   */
  static isConfigured(): boolean {
    return supabase !== null
  }

  /**
   * Get total waitlist count from Supabase
   */
  static async getTotalCount(): Promise<number> {
    if (!supabase) {
      console.warn('Supabase not configured, returning 0')
      return 0
    }

    try {
      const { count, error } = await supabase
        .from('waitlist') // Replace with your actual table name
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Supabase count error:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching waitlist count:', error)
      return 0
    }
  }

  /**
   * Get converted waitlist count (those who became users)
   */
  static async getConvertedCount(): Promise<number> {
    if (!supabase) {
      console.warn('Supabase not configured, returning 0')
      return 0
    }

    try {
      // Adjust this query based on your table structure
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.converted,converted_at.not.is.null') // OR condition for converted status

      if (error) {
        console.error('Supabase converted count error:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching converted count:', error)
      return 0
    }
  }

  /**
   * Get recent waitlist entries
   */
  static async getRecentEntries(limit: number = 10): Promise<SupabaseWaitlistEntry[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Supabase recent entries error:', error)
        return []
      }

      return (data || []).map((entry: SupabaseWaitlistEntry): WaitlistEntry => ({
        id: entry.id,
        email: entry.email,
        created_at: entry.created_at,
        addedAt: entry.created_at ? new Date(entry.created_at) : undefined,
        usedAt: entry.converted_at ? new Date(entry.converted_at) : null,
        isUsed: !!(entry.status === 'converted' || entry.converted_at),
        status: entry.status,
        converted_at: entry.converted_at
      }))
    } catch (error) {
      console.error('Error fetching recent entries:', error)
      return []
    }
  }

  /**
   * Get waitlist entries with server-side filtering and pagination
   */
  static async getEntriesWithFilters(options: {
    search?: string
    filter?: string // all, used, unused
    limit?: number
    offset?: number
  }): Promise<{ entries: SupabaseWaitlistEntry[], total: number }> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty result')
      return { entries: [], total: 0 }
    }

    const { search = '', filter = 'all', limit = 50, offset = 0 } = options

    try {
      let query = supabase
        .from('waitlist')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply search filter
      if (search) {
        query = query.ilike('email', `%${search}%`)
      }

      // Apply status filter
      if (filter === 'used') {
        query = query.or('status.eq.converted,converted_at.not.is.null')
      } else if (filter === 'unused') {
        query = query.is('status', null).is('converted_at', null)
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase filtered entries error:', error)
        return { entries: [], total: 0 }
      }

      return {
        entries: (data || []).map((entry: SupabaseWaitlistEntry): WaitlistEntry => ({
          id: entry.id,
          email: entry.email,
          created_at: entry.created_at,
          addedAt: entry.created_at ? new Date(entry.created_at) : undefined,
          usedAt: entry.converted_at ? new Date(entry.converted_at) : null,
          isUsed: !!(entry.status === 'converted' || entry.converted_at),
          status: entry.status,
          converted_at: entry.converted_at
        })),
        total: count || 0
      }
    } catch (error) {
      console.error('Get entries with filters error:', error)
      return { entries: [], total: 0 }
    }
  }

  /**
   * Get waitlist statistics
   */
  static async getWaitlistStats() {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty stats')
      return {
        totalCount: 0,
        convertedCount: 0,
        conversionRate: 0,
        recentEntries: []
      }
    }

    try {
      const [totalCount, convertedCount, recentEntries] = await Promise.all([
        this.getTotalCount(),
        this.getConvertedCount(),
        this.getRecentEntries(5)
      ])

      const conversionRate = totalCount > 0 ? (convertedCount / totalCount) * 100 : 0

      return {
        totalCount,
        convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        recentEntries
      }
    } catch (error) {
      console.error('Error fetching waitlist stats:', error)
      return {
        totalCount: 0,
        convertedCount: 0,
        conversionRate: 0,
        recentEntries: []
      }
    }
  }

  /**
   * Add email to waitlist
   */
  static async addToWaitlist(email: string, additionalData?: any) {
    if (!supabase) {
      throw new Error('Supabase not configured. Cannot add to waitlist.')
    }

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          email,
          created_at: new Date().toISOString(),
          ...additionalData
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error adding to waitlist:', error)
      throw error
    }
  }
}

export default supabase
