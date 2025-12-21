import { type GraphQLContext, requireAuth, requireRole } from "../context"
import { bids, lineItems, alternates } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export const bidResolvers = {
  Query: {
    async bids(_: unknown, { filter }: { filter?: any }, context: GraphQLContext) {
      const conditions = []

      if (filter?.projectId) {
        conditions.push(eq(bids.projectId, filter.projectId))
      }

      if (filter?.status) {
        conditions.push(eq(bids.status, filter.status))
      }

      if (filter?.subcontractorId) {
        conditions.push(eq(bids.subcontractorId, filter.subcontractorId))
      }

      const result = await context.db.query.bids.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          project: {
            with: {
              createdBy: {
                with: {
                  company: true,
                },
              },
            },
          },
          subcontractor: {
            with: {
              company: true,
            },
          },
          lineItems: true,
          alternates: true,
        },
        orderBy: (bids, { desc }) => [desc(bids.createdAt)],
      })

      return result
    },

    async bid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const bid = await context.db.query.bids.findFirst({
        where: eq(bids.id, id),
        with: {
          project: {
            with: {
              createdBy: true,
            },
          },
          subcontractor: {
            with: {
              company: true,
            },
          },
          lineItems: true,
          alternates: true,
        },
      })

      return bid
    },

    async myBids(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      const result = await context.db.query.bids.findMany({
        where: eq(bids.subcontractorId, userId),
        with: {
          project: {
            with: {
              createdBy: {
                with: {
                  company: true,
                },
              },
            },
          },
          lineItems: true,
          alternates: true,
        },
        orderBy: (bids, { desc }) => [desc(bids.createdAt)],
      })

      return result
    },
  },

  Mutation: {
    async createBid(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "SUBCONTRACTOR")

      // Create bid
      const [bid] = await context.db
        .insert(bids)
        .values({
          projectId: input.projectId,
          subcontractorId: userId,
          totalAmount: input.totalAmount,
          notes: input.notes,
          completionTime: input.completionTime,
        })
        .returning()

      // Add line items
      if (input.lineItems?.length > 0) {
        await context.db.insert(lineItems).values(
          input.lineItems.map((item: any, index: number) => ({
            bidId: bid.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: String(Number(item.quantity) * Number(item.unitPrice)),
            notes: item.notes,
            sortOrder: index,
          })),
        )
      }

      // Add alternates
      if (input.alternates?.length > 0) {
        await context.db.insert(alternates).values(
          input.alternates.map((alt: any) => ({
            bidId: bid.id,
            description: alt.description,
            adjustmentAmount: alt.adjustmentAmount,
            notes: alt.notes,
          })),
        )
      }

      return bid
    },

    async updateBid(_: unknown, { id, input }: { id: string; input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const bid = await context.db.query.bids.findFirst({
        where: eq(bids.id, id),
      })

      if (!bid || bid.subcontractorId !== userId) {
        throw new Error("Bid not found or access denied")
      }

      // Update bid
      const [updated] = await context.db
        .update(bids)
        .set({
          totalAmount: input.totalAmount,
          notes: input.notes,
          completionTime: input.completionTime,
          updatedAt: new Date(),
        })
        .where(eq(bids.id, id))
        .returning()

      return updated
    },

    async submitBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(bids)
        .set({
          status: "SUBMITTED",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(bids.id, id), eq(bids.subcontractorId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Bid not found or access denied")
      }

      return updated
    },

    async withdrawBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(bids)
        .set({ status: "WITHDRAWN", updatedAt: new Date() })
        .where(and(eq(bids.id, id), eq(bids.subcontractorId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Bid not found or access denied")
      }

      return updated
    },

    async awardBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "CONTRACTOR")

      // Get bid to verify project ownership
      const bid = await context.db.query.bids.findFirst({
        where: eq(bids.id, id),
        with: {
          project: true,
        },
      })

      if (!bid || bid.project.createdById !== userId) {
        throw new Error("Bid not found or access denied")
      }

      // Award bid
      const [updated] = await context.db
        .update(bids)
        .set({ status: "AWARDED", updatedAt: new Date() })
        .where(eq(bids.id, id))
        .returning()

      return updated
    },
  },
}
