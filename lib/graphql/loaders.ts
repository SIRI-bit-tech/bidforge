import DataLoader from "dataloader"
import { db } from "@/lib/db"
import { users, companies, projects, bids, trades } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"

// DataLoader for users - prevents N+1 queries when fetching user relationships
export function createUserLoader() {
  return new DataLoader(async (userIds: readonly string[]) => {
    const usersData = await db.query.users.findMany({
      where: inArray(users.id, [...userIds]),
      with: {
        company: {
          with: {
            trades: {
              with: {
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
    const companiesData = await db.query.companies.findMany({
      where: inArray(companies.id, [...companyIds]),
      with: {
        trades: {
          with: {
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
    const projectsData = await db.query.projects.findMany({
      where: inArray(projects.id, [...projectIds]),
      with: {
        createdBy: true,
        trades: {
          with: {
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
    const bidsData = await db.query.bids.findMany({
      where: inArray(bids.id, [...bidIds]),
      with: {
        subcontractor: {
          with: {
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
    const tradesData = await db.query.trades.findMany({
      where: inArray(trades.id, [...tradeIds]),
    })

    const tradeMap = new Map(tradesData.map((trade) => [trade.id, trade]))
    return tradeIds.map((id) => tradeMap.get(id) || null)
  })
}
