import { type GraphQLContext, requireAuth, requireRole } from "../context"
import { projects, projectTrades } from "@/lib/db/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"

export const projectResolvers = {
  Query: {
    async projects(
      _: unknown,
      { filter, limit = 50, offset = 0 }: { filter?: any; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const conditions = []

      if (filter?.status) {
        conditions.push(eq(projects.status, filter.status))
      }

      if (filter?.budgetMin) {
        conditions.push(gte(projects.budgetMin, filter.budgetMin))
      }

      if (filter?.budgetMax) {
        conditions.push(lte(projects.budgetMax, filter.budgetMax))
      }

      const result = await context.db.query.projects.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        with: {
          createdBy: {
            with: {
              company: true,
            },
          },
          trades: {
            with: {
              trade: true,
            },
          },
          bids: true,
        },
        orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      })

      return result
    },

    async project(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const project = await context.db.query.projects.findFirst({
        where: eq(projects.id, id),
        with: {
          createdBy: {
            with: {
              company: true,
            },
          },
          trades: {
            with: {
              trade: true,
            },
          },
          bids: {
            with: {
              subcontractor: {
                with: {
                  company: true,
                },
              },
              lineItems: true,
              alternates: true,
            },
          },
          documents: true,
          invitations: {
            with: {
              subcontractor: {
                with: {
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

      const result = await context.db.query.projects.findMany({
        where: eq(projects.createdById, userId),
        with: {
          trades: {
            with: {
              trade: true,
            },
          },
          bids: true,
        },
        orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      })

      return result
    },
  },

  Mutation: {
    async createProject(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)
      requireRole(context, "CONTRACTOR")

      // Create project
      const [project] = await context.db
        .insert(projects)
        .values({
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
        })
        .returning()

      // Add trades
      if (input.tradeIds?.length > 0) {
        await context.db.insert(projectTrades).values(
          input.tradeIds.map((tradeId: string) => ({
            projectId: project.id,
            tradeId,
          })),
        )
      }

      return project
    },

    async updateProject(_: unknown, { id, input }: { id: string; input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const project = await context.db.query.projects.findFirst({
        where: eq(projects.id, id),
      })

      if (!project || project.createdById !== userId) {
        throw new Error("Project not found or access denied")
      }

      // Update project
      const [updated] = await context.db
        .update(projects)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning()

      return updated
    },

    async publishProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(projects)
        .set({ status: "PUBLISHED", updatedAt: new Date() })
        .where(and(eq(projects.id, id), eq(projects.createdById, userId)))
        .returning()

      if (!updated) {
        throw new Error("Project not found or access denied")
      }

      return updated
    },

    async closeProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(projects)
        .set({ status: "CLOSED", updatedAt: new Date() })
        .where(and(eq(projects.id, id), eq(projects.createdById, userId)))
        .returning()

      if (!updated) {
        throw new Error("Project not found or access denied")
      }

      return updated
    },

    async deleteProject(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      await context.db.delete(projects).where(and(eq(projects.id, id), eq(projects.createdById, userId)))

      return true
    },
  },

  Project: {
    async trades(parent: any, _: unknown, context: GraphQLContext) {
      const result = await context.db.query.projectTrades.findMany({
        where: eq(projectTrades.projectId, parent.id),
        with: {
          trade: true,
        },
      })

      return result.map((pt) => pt.trade)
    },

    async bidCount(parent: any, _: unknown, context: GraphQLContext) {
      const result = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.id, parent.id))

      return result[0]?.count || 0
    },

    async averageBid(parent: any, _: unknown, context: GraphQLContext) {
      const result = await context.db
        .select({ avg: sql<number>`avg(total_amount)` })
        .from(projects)
        .where(eq(projects.id, parent.id))

      return result[0]?.avg || null
    },
  },
}
