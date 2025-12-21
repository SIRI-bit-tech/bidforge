import { type GraphQLContext, requireAuth } from "../context"
import { projects, bids } from "@/lib/db/schema"
import { eq, and, count, avg } from "drizzle-orm"

export const analyticsResolvers = {
  Query: {
    // Get analytics for current user
    async analytics(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)
      const userRole = context.userRole

      if (userRole === "CONTRACTOR") {
        // Contractor analytics
        const [totalProjects] = await context.db
          .select({ count: count() })
          .from(projects)
          .where(eq(projects.createdById, userId))

        const [activeProjects] = await context.db
          .select({ count: count() })
          .from(projects)
          .where(and(eq(projects.createdById, userId), eq(projects.status, "PUBLISHED")))

        const [bidStats] = await context.db
          .select({
            total: count(),
            average: avg(bids.totalAmount),
          })
          .from(bids)
          .innerJoin(projects, eq(projects.id, bids.projectId))
          .where(eq(projects.createdById, userId))

        return {
          totalProjects: totalProjects?.count || 0,
          activeProjects: activeProjects?.count || 0,
          totalBids: bidStats?.total || 0,
          averageBidAmount: bidStats?.average || "0",
          winRate: null,
          responseRate: null,
        }
      } else {
        // Subcontractor analytics
        const [totalBids] = await context.db
          .select({ count: count() })
          .from(bids)
          .where(eq(bids.subcontractorId, userId))

        const [awardedBids] = await context.db
          .select({ count: count() })
          .from(bids)
          .where(and(eq(bids.subcontractorId, userId), eq(bids.status, "AWARDED")))

        const [avgBid] = await context.db
          .select({ average: avg(bids.totalAmount) })
          .from(bids)
          .where(eq(bids.subcontractorId, userId))

        const winRate = totalBids?.count ? ((awardedBids?.count || 0) / totalBids.count) * 100 : 0

        return {
          totalProjects: 0,
          activeProjects: 0,
          totalBids: totalBids?.count || 0,
          averageBidAmount: avgBid?.average || "0",
          winRate,
          responseRate: null,
        }
      }
    },
  },
}
