import type { GraphQLContext } from "../context"

export const tradeResolvers = {
  Query: {
    // Get all trades
    async trades(_: unknown, __: unknown, context: GraphQLContext) {
      const result = await context.prisma.trade.findMany({
        orderBy: { name: 'asc' }
      })

      return result
    },
  },
}
