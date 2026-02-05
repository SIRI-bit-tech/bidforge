import { type GraphQLContext, requireAuth, requireRole } from "../context"

export const bidResolvers = {
  Query: {
    async bids(_: unknown, { filter }: { filter?: any }, context: GraphQLContext) {
      const where: any = {}

      if (filter?.projectId) {
        where.projectId = filter.projectId
      }

      if (filter?.status) {
        where.status = filter.status
      }

      if (filter?.subcontractorId) {
        where.subcontractorId = filter.subcontractorId
      }

      const result = await context.prisma.bid.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          project: {
            include: {
              createdBy: {
                include: {
                  company: true,
                },
              },
            },
          },
          subcontractor: {
            include: {
              company: true,
            },
          },
          lineItems: true,
          alternates: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return result
    },

    async bid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const bid = await context.prisma.bid.findUnique({
        where: { id },
        include: {
          project: {
            include: {
              createdBy: true,
            },
          },
          subcontractor: {
            include: {
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

      const result = await context.prisma.bid.findMany({
        where: { subcontractorId: userId },
        include: {
          project: {
            include: {
              createdBy: {
                include: {
                  company: true,
                },
              },
            },
          },
          lineItems: true,
          alternates: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return result
    },
  },

  Mutation: {
    async createBid(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "SUBCONTRACTOR")

      // Create bid
      const bid = await context.prisma.bid.create({
        data: {
          projectId: input.projectId,
          subcontractorId: userId,
          totalAmount: input.totalAmount,
          notes: input.notes,
          completionTime: input.completionTime,
        }
      })

      // Add line items
      if (input.lineItems?.length > 0) {
        await context.prisma.lineItem.createMany({
          data: input.lineItems.map((item: any, index: number) => ({
            bidId: bid.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: String(Number(item.quantity) * Number(item.unitPrice)),
            notes: item.notes,
            sortOrder: index,
          }))
        })
      }

      // Add alternates
      if (input.alternates?.length > 0) {
        await context.prisma.alternate.createMany({
          data: input.alternates.map((alt: any) => ({
            bidId: bid.id,
            description: alt.description,
            adjustmentAmount: alt.adjustmentAmount,
            notes: alt.notes,
          }))
        })
      }

      return bid
    },

    async updateBid(_: unknown, { id, input }: { id: string; input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const bid = await context.prisma.bid.findUnique({
        where: { id }
      })

      if (!bid || bid.subcontractorId !== userId) {
        throw new Error("Bid not found or access denied")
      }

      // Update bid
      const updated = await context.prisma.bid.update({
        where: { id },
        data: {
          totalAmount: input.totalAmount,
          notes: input.notes,
          completionTime: input.completionTime,
          updatedAt: new Date(),
        }
      })

      return updated
    },

    async submitBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.bid.updateMany({
        where: { 
          id, 
          subcontractorId: userId 
        },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          updatedAt: new Date(),
        }
      })

      if (updated.count === 0) {
        throw new Error("Bid not found or access denied")
      }

      const bid = await context.prisma.bid.findUnique({ where: { id } })
      return bid
    },

    async withdrawBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.bid.updateMany({
        where: { 
          id, 
          subcontractorId: userId 
        },
        data: { 
          status: "WITHDRAWN", 
          updatedAt: new Date() 
        }
      })

      if (updated.count === 0) {
        throw new Error("Bid not found or access denied")
      }

      const bid = await context.prisma.bid.findUnique({ where: { id } })
      return bid
    },

    async awardBid(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "CONTRACTOR")

      // Get bid to verify project ownership
      const bid = await context.prisma.bid.findUnique({
        where: { id },
        include: {
          project: true,
        },
      })

      if (!bid || bid.project.createdById !== userId) {
        throw new Error("Bid not found or access denied")
      }

      // Award bid
      const updated = await context.prisma.bid.update({
        where: { id },
        data: { 
          status: "AWARDED", 
          updatedAt: new Date() 
        }
      })

      return updated
    },
  },
}
