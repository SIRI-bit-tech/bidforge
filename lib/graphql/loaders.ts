import DataLoader from "dataloader"
import prisma from "@/lib/prisma"

// DataLoader for users - prevents N+1 queries when fetching user relationships
export function createUserLoader() {
  return new DataLoader(async (userIds: readonly string[]) => {
    const usersData = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      include: {
        company: {
          include: {
            trades: {
              include: {
                trade: true,
              },
            },
          },
        },
      },
    })

    // Create map for O(1) lookups
    const userMap = new Map(usersData.map((user) => [user.id, user]))

    // Return in same order as requested
    return userIds.map((id) => userMap.get(id) || null)
  })
}

// DataLoader for companies - optimizes company fetching
export function createCompanyLoader() {
  return new DataLoader(async (companyIds: readonly string[]) => {
    const companiesData = await prisma.company.findMany({
      where: { id: { in: [...companyIds] } },
      include: {
        trades: {
          include: {
            trade: true,
          },
        },
        certifications: true,
        insurance: true,
      },
    })

    const companyMap = new Map(companiesData.map((company) => [company.id, company]))
    return companyIds.map((id) => companyMap.get(id) || null)
  })
}

// DataLoader for projects - batch loads projects with relations
export function createProjectLoader() {
  return new DataLoader(async (projectIds: readonly string[]) => {
    const projectsData = await prisma.project.findMany({
      where: { id: { in: [...projectIds] } },
      include: {
        createdBy: true,
        trades: {
          include: {
            trade: true,
          },
        },
        documents: true,
      },
    })

    const projectMap = new Map(projectsData.map((project) => [project.id, project]))
    return projectIds.map((id) => projectMap.get(id) || null)
  })
}

// DataLoader for bids - optimizes bid fetching with line items
export function createBidLoader() {
  return new DataLoader(async (bidIds: readonly string[]) => {
    const bidsData = await prisma.bid.findMany({
      where: { id: { in: [...bidIds] } },
      include: {
        subcontractor: {
          include: {
            company: true,
          },
        },
        lineItems: true,
        alternates: true,
      },
    })

    const bidMap = new Map(bidsData.map((bid) => [bid.id, bid]))
    return bidIds.map((id) => bidMap.get(id) || null)
  })
}

// DataLoader for trades - caches trade lookups
export function createTradeLoader() {
  return new DataLoader(async (tradeIds: readonly string[]) => {
    const tradesData = await prisma.trade.findMany({
      where: { id: { in: [...tradeIds] } },
    })

    const tradeMap = new Map(tradesData.map((trade) => [trade.id, trade]))
    return tradeIds.map((id) => tradeMap.get(id) || null)
  })
}
