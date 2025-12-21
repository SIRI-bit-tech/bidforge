"use client"

import { useQuery, useMutation } from "urql"
import { LOGIN, REGISTER, ME, UPDATE_PROFILE } from "@/lib/graphql/queries/auth"
import { useRouter } from "next/navigation"

// Custom hook for authentication with GraphQL
export function useAuth() {
  const router = useRouter()
  const [{ data: meData, fetching: meLoading }] = useQuery({ query: ME })
  const [, loginMutation] = useMutation(LOGIN)
  const [, registerMutation] = useMutation(REGISTER)
  const [, updateProfileMutation] = useMutation(UPDATE_PROFILE)

  const login = async (email: string, password: string) => {
    const result = await loginMutation({ email, password })
    if (result.data?.login?.token) {
      localStorage.setItem("auth_token", result.data.login.token)
      router.push("/dashboard")
    }
    return result
  }

  const register = async (input: { name: string; email: string; password: string; role: string }) => {
    const result = await registerMutation({ input })
    if (result.data?.register?.token) {
      localStorage.setItem("auth_token", result.data.register.token)
      router.push("/onboarding")
    }
    return result
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    router.push("/login")
  }

  const updateProfile = async (input: { name?: string; email?: string }) => {
    return await updateProfileMutation({ input })
  }

  return {
    user: meData?.me,
    loading: meLoading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!meData?.me,
  }
}
