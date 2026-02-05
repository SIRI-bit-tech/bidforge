import { type GraphQLContext, requireAuth } from "../context"

export const analyticsResolvers = {
  Query: {
    // Get analytics for current user
    async analytics(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)
      const userRole = context.userRole

      if (userRole === "CONTRACTOR") {
        // Contractor analytics
        const totalProjects = await context.prisma.project.count({
          where: { createdById: userId }
        })

        const activeProjects = await context.prisma.project.count({
          where: { 
            createdById: userId, 
            status: "PUBLISHED" 
          }
        })

        const bidStats = await context.prisma.bid.aggregate({
          where: {
            project: {
              createdById: userId
            }
          },
          _count: true,
          _avg: {
            totalAmount: true
          }
        })

        return {
          totalProjects: totalProjects || 0,
          activeProjects: activeProjects || 0,
          totalBids: bidStats._count || 0,
          averageBidAmount: bidStats._avg.totalAmount?.toString() || "0",
          winRate: null,
          responseRate: null,
        }
      } else {
        // Subcontractor analytics
        const totalBids = await context.prisma.bid.count({
          where: { subcontractorId: userId }
        })

        const awardedBids = await context.prisma.bid.count({
          where: { 
            subcontractorId: userId, 
            status: "AWARDED" 
          }
        })

        const avgBid = await context.prisma.bid.aggregate({
          where: { subcontractorId: userId },
          _avg: {
            totalAmount: true
          }
        })

        const winRate = totalBids ? (awardedBids / totalBids) * 100 : 0

        return {
          totalProjects: 0,
          activeProjects: 0,
          totalBids: totalBids || 0,
          averageBidAmount: avgBid._avg.totalAmount?.toString() || "0",
          winRate,
          responseRate: null,
        }
      }
    },
  },
}
