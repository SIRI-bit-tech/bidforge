import type { GraphQLContext } from "../context"

export const tradeResolvers = {
  Query: {
    // Get all trades
    async trades(_: unknown, __: unknown, context: GraphQLContext) {
      const result = await context.db.query.trades.findMany({
        orderBy: (trades, { asc }) => [asc(trades.name)],
      })

      return result
    },
  },
}
