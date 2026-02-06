import { type GraphQLContext, requireAuth, requireRole } from "../context"

export const projectResolvers = {
  Query: {
    async projects(
      _: unknown,
      { filter, limit = 50, offset = 0 }: { filter?: any; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const where: any = {}

      if (filter?.status) {
        where.status = filter.status
      }

      if (filter?.budgetMin) {
        where.budgetMin = { gte: filter.budgetMin }
      }

      if (filter?.budgetMax) {
        where.budgetMax = { lte: filter.budgetMax }
      }

      const result = await context.prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            include: {
              company: true,
            },
          },
          trades: {
            include: {
              trade: true,
            },
          },
          bids: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return result
    },

    async project(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const project = await context.prisma.project.findFirst({
        where: { id },
        include: {
          createdBy: {
            include: {
              company: true,
            },
          },
          trades: {
            include: {
              trade: true,
            },
          },
          bids: {
            include: {
              subcontractor: {
                include: {
                  company: true,
                },
              },
              lineItems: true,
              alternates: true,
            },
          },
          documents: true,
          invitations: {
            include: {
              subcontractor: {
                include: {
                  company: true,
                },
              },
            },
          },
        },
      })

      return project
    },

    async myProjects(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      const result = await context.prisma.project.findMany({
        where: { createdById: userId },
        include: {
          trades: {
            include: {
              trade: true,
            },
          },
          bids: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return result
    },
  },

  Mutation: {
    async createProject(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "CONTRACTOR")

      // Create project
      const project = await context.prisma.project.create({
        data: {
          title: input.title,
          description: input.description,
          location: input.location,
          city: input.city,
          state: input.state,
          budgetMin: input.budgetMin,
          budgetMax: input.budgetMax,
          startDate: input.startDate,
          endDate: input.endDate,
          deadline: input.deadline,
          createdById: userId,
        },
      })

      // Add trades
      if (input.tradeIds?.length > 0) {
        await context.prisma.projectTrade.createMany({
          data: input.tradeIds.map((tradeId: string) => ({
            projectId: project.id,
            tradeId,
          })),
        })
      }

      return project
    },

    async updateProject(_: unknown, { id, input }: { id: string; input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const project = await context.prisma.project.findFirst({
        where: { id },
      })

      if (!project || project.createdById !== userId) {
        throw new Error("Project not found or access denied")
      }

      // Validate and sanitize input
      const allowedFields = [
        "title",
        "description",
        "location",
        "city",
        "state",
        "budgetMin",
        "budgetMax",
        "startDate",
        "endDate",
        "deadline"
      ]

      const filteredUpdates: any = {}
      for (const key of Object.keys(input)) {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = input[key]
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error("No valid update fields provided")
      }

      // Update project
      const updated = await context.prisma.project.update({
        where: { id },
        data: {
          ...filteredUpdates,
          updatedAt: new Date(),
        },
      })

      return updated
    },

    async publishProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.project.updateMany({
        where: {
          id,
          createdById: userId,
        },
        data: {
          status: "PUBLISHED",
          updatedAt: new Date(),
        },
      })

      if (updated.count === 0) {
        throw new Error("Project not found or access denied")
      }

      return await context.prisma.project.findUnique({ where: { id } })
    },

    async closeProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.project.updateMany({
        where: {
          id,
          createdById: userId,
        },
        data: {
          status: "CLOSED",
          updatedAt: new Date(),
        },
      })

      if (updated.count === 0) {
        throw new Error("Project not found or access denied")
      }

      return await context.prisma.project.findUnique({ where: { id } })
    },

    async deleteProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const deleted = await context.prisma.project.deleteMany({
        where: {
          id,
          createdById: userId,
        },
      })

      if (deleted.count === 0) {
        throw new Error("Project not found or access denied")
      }

      return true
    },
  },

  Project: {
    async trades(parent: any, _: unknown, context: GraphQLContext) {
      const result = await context.prisma.projectTrade.findMany({
        where: { projectId: parent.id },
        include: {
          trade: true,
        },
      })

      return result.map((pt) => pt.trade)
    },

    async bidCount(parent: any, _: unknown, context: GraphQLContext) {
      const count = await context.prisma.bid.count({
        where: { projectId: parent.id },
      })

      return count
    },

    async averageBid(parent: any, _: unknown, context: GraphQLContext) {
      const result = await context.prisma.bid.aggregate({
        where: { projectId: parent.id },
        _avg: {
          totalAmount: true,
        },
      })

      return result._avg.totalAmount || null
    },
  },
}
