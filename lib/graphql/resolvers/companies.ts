import { type GraphQLContext, requireAuth } from "../context"
import { companies, companyTrades, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const companyResolvers = {
  Query: {
    // Get subcontractors with filtering
    async subcontractors(
      _: unknown,
      { tradeId, city, state }: { tradeId?: string; city?: string; state?: string },
      context: GraphQLContext,
    ) {
      requireAuth(context)

      // Build query conditions
      const conditions = [eq(users.role, "SUBCONTRACTOR")]

      const result = await context.db.query.users.findMany({
        where: eq(users.role, "SUBCONTRACTOR"),
        with: {
          company: {
            with: {
              trades: {
                with: {
                  trade: true,
                },
              },
              certifications: true,
              insurance: true,
            },
          },
        },
        limit: 100,
      })

      // Filter by trade, city, state if provided
      let filtered = result

      if (tradeId) {
        filtered = filtered.filter((user) => user.company?.trades?.some((ct: any) => ct.trade?.id === tradeId))
      }

      if (city) {
        filtered = filtered.filter((user) => user.company?.city?.toLowerCase() === city.toLowerCase())
      }

      if (state) {
        filtered = filtered.filter((user) => user.company?.state?.toLowerCase() === state.toLowerCase())
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

      const [company] = await context.db
        .insert(companies)
        .values({
          name: input.name,
          type: input.type,
          address: input.address,
          city: input.city,
          state: input.state,
          zip: input.zip,
          phone: input.phone,
          website: input.website,
          description: input.description,
        })
        .returning()

      // Link company to user
      await context.db.update(users).set({ companyId: company.id }).where(eq(users.id, userId))

      // Add trades if provided
      if (input.tradeIds?.length > 0) {
        await context.db.insert(companyTrades).values(
          input.tradeIds.map((tradeId: string) => ({
            companyId: company.id,
            tradeId,
          })),
        )
      }

      return company
    },

    // Update company profile
    async updateCompany(_: unknown, { input }: { input: any }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Get user's company
      const user = await context.db.query.users.findFirst({
        where: eq(users.id, userId),
      })

      if (!user?.companyId) {
        throw new Error("Company not found")
      }

      const [updated] = await context.db
        .update(companies)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, user.companyId))
        .returning()

      return updated
    },
  },
}
