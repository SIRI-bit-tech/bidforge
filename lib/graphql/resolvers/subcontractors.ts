import prisma from "@/lib/prisma"
import { cache } from "@/lib/cache/redis"

// Subcontractor resolver for directory and profile queries
export const subcontractorResolvers = {
  Query: {
    // Search subcontractors with filtering
    subcontractors: async (_: any, args: any, context: any) => {
      const { trade, location, certified, insured, limit = 20, offset = 0 } = args

      // Build cache key
      const cacheKey = `subcontractors:${JSON.stringify(args)}`
      const cached = await cache.get(cacheKey)
      if (cached) return cached

      const where: any = { type: "SUBCONTRACTOR" }

      // Apply filters
      if (location) {
        where.address = { contains: location, mode: 'insensitive' }
      }

      const results = await prisma.company.findMany({
        where,
        take: limit,
        skip: offset,
      })

      // Cache for 5 minutes
      await cache.set(cacheKey, results, 300)

      return results
    },

    // Get single subcontractor profile
    subcontractor: async (_: any, { id }: any, context: any) => {
      const cacheKey = `subcontractor:${id}`
      const cached = await cache.get(cacheKey)
      if (cached) return cached

      // Use DataLoader to batch query
      const company = await context.loaders.company.load(id)

      if (!company || company.type !== "SUBCONTRACTOR") {
        throw new Error("Subcontractor not found")
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, company, 600)

      return company
    },
  },

  Subcontractor: {
    // Resolve certifications for subcontractor
    certifications: async (parent: any, _: any, context: any) => {
      return await prisma.certification.findMany({
        where: { companyId: parent.id }
      })
    },

    // Resolve insurance documents
    insurance: async (parent: any, _: any, context: any) => {
      return await prisma.insurance.findMany({
        where: { companyId: parent.id }
      })
    },

    // Resolve past projects
    pastProjects: async (parent: any, _: any, context: any) => {
      return await context.loaders.companyProjectsLoader.load(parent.id)
    },

    // Calculate win rate
    winRate: async (parent: any, _: any, context: any) => {
      const bids = await context.loaders.companyBidsLoader.load(parent.id)
      if (!bids || bids.length === 0) return 0

      const awardedBids = bids.filter((bid: any) => bid.status === "AWARDED")
      return (awardedBids.length / bids.length) * 100
    },
  },
}
