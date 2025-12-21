import { createYoga } from "graphql-yoga"
import { createSchema } from "graphql-yoga"
import { typeDefs } from "@/lib/graphql/schema"
import { resolvers } from "@/lib/graphql/resolvers"
import { createContext } from "@/lib/graphql/context"

// Create GraphQL schema
const schema = createSchema({
  typeDefs,
  resolvers,
})

// Create Yoga instance
const { handleRequest } = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
})

// Export handlers for Next.js App Router
export { handleRequest as GET, handleRequest as POST }
