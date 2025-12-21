import { cacheExchange, createClient, fetchExchange } from "urql"

// Simplified URQL client configuration for BidForge GraphQL API
export const graphqlClient = createClient({
  url: process.env.NEXT_PUBLIC_GRAPHQL_URL || "/api/graphql",
  exchanges: [
    cacheExchange,
    fetchExchange,
  ],
  fetchOptions: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    return {
      headers: {
        authorization: token ? `Bearer ${token}` : "",
      },
    }
  },
})
