// GraphCache configuration for optimistic updates and normalized caching
export const graphcacheConfig = {
  keys: {
    Project: (data: any) => data.id,
    Bid: (data: any) => data.id,
    User: (data: any) => data.id,
    Company: (data: any) => data.id,
    Document: (data: any) => data.id,
    Invitation: (data: any) => data.id,
    Message: (data: any) => data.id,
    Trade: (data: any) => data.id,
    LineItem: (data: any) => data.id,
    Alternate: (data: any) => data.id,
  },
  optimistic: {
    // Optimistic updates for better UX
    createBid: (args: any, cache: any, info: any) => ({
      __typename: "Bid",
      id: "temp-" + Date.now(),
      status: "DRAFT",
      totalAmount: 0,
      submittedAt: new Date().toISOString(),
      ...args.input,
    }),
    updateBid: (args: any, cache: any, info: any) => ({
      __typename: "Bid",
      id: args.id,
      ...args.input,
    }),
    acceptInvitation: (args: any, cache: any, info: any) => ({
      __typename: "Invitation",
      id: args.invitationId,
      status: "ACCEPTED",
      respondedAt: new Date().toISOString(),
    }),
  },
  updates: {
    Mutation: {
      // Update cache after mutations
      createBid: (result: any, args: any, cache: any, info: any) => {
        cache.invalidate("Query", "myBids")
        cache.invalidate("Query", "bids", { projectId: args.input.projectId })
      },
      createProject: (result: any, args: any, cache: any, info: any) => {
        cache.invalidate("Query", "projects")
        cache.invalidate("Query", "myProjects")
      },
      awardBid: (result: any, args: any, cache: any, info: any) => {
        cache.invalidate("Query", "project", { id: result.project.id })
        cache.invalidate("Query", "bids")
      },
    },
  },
}
