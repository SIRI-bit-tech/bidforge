import { type GraphQLContext, requireAuth } from "../context"

export const companyResolvers = {
  Query: {
    // Get subcontractors with filtering
    async subcontractors(
      _: unknown,
      { tradeId, city, state }: { tradeId?: string; city?: string; state?: string },
      context: GraphQLContext,
    ) {
      requireAuth(context)

      // Build where clause for database filtering when possible
      const where: any = { role: "SUBCONTRACTOR" }
      
      // Add company filters to the database query when possible
      if (city || state) {
        where.company = {}
        if (city) {
          where.company.city = { equals: city, mode: 'insensitive' }
        }
        if (state) {
          where.company.state = { equals: state, mode: 'insensitive' }
        }
      }

      const result = await context.prisma.user.findMany({
        where,
        include: {
          company: {
            include: {
              trades: {
                include: {
                  trade: true,
                },
              },
              certifications: true,
              insurance: true,
            },
          },
        },
        take: 100,
      }) as any[] // Type assertion to handle the included relations

      // Filter by trade if provided (needs to be done in memory due to complex relation)
      let filtered = result

      if (tradeId) {
        filtered = filtered.filter((user) => 
          user.company?.trades?.some((ct: any) => ct.trade?.id === tradeId)
        )
      }

      return filtered
    },

    // Get single subcontractor
    async subcontractor(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireAuth(context)

      const user = await context.loaders.user.load(id)

      if (!user || user.role !== "SUBCONTRACTOR") {
        throw new Error("Subcontractor not found")
      }

      return user
    },
  },

  Mutation: {
    // Create company profile
    async createCompany(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const company = await context.prisma.company.create({
        data: {
          name: input.name,
          type: input.type,
          address: input.address,
          city: input.city,
          state: input.state,
          zip: input.zip,
          phone: input.phone,
          website: input.website,
          description: input.description,
        }
      })

      // Link company to user
      await context.prisma.user.update({
        where: { id: userId },
        data: { companyId: company.id }
      })

      // Add trades if provided
      if (input.tradeIds?.length > 0) {
        await context.prisma.companyTrade.createMany({
          data: input.tradeIds.map((tradeId: string) => ({
            companyId: company.id,
            tradeId,
          }))
        })
      }

      return company
    },

    // Update company profile
    async updateCompany(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Get user's company
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      })

      if (!user?.companyId) {
        throw new Error("Company not found")
      }

      const updated = await context.prisma.company.update({
        where: { id: user.companyId },
        data: {
          ...input,
          updatedAt: new Date(),
        }
      })

      return updated
    },
  },
}
