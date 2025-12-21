"use client"

import type React from "react"

import { Provider } from "urql"
import { graphqlClient } from "@/lib/graphql/client"

// URQL Provider wrapper for GraphQL client
export function URQLProvider({ children }: { children: React.ReactNode }) {
  return <Provider value={graphqlClient}>{children}</Provider>
}
