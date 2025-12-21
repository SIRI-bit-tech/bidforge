import { pubsub } from "../pubsub"
import { requireAuth, type GraphQLContext } from "../context"

export const subscriptionResolvers = {
  Subscription: {
    // Real-time bid submission notifications
    bidSubmitted: {
      subscribe: (_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("BID_SUBMITTED", (payload) => payload.projectId === projectId)
      },
      resolve: (payload: any) => payload.bid,
    },

    // Bid update notifications
    bidUpdated: {
      subscribe: (_: unknown, { bidId }: { bidId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("BID_UPDATED", (payload) => payload.bidId === bidId)
      },
      resolve: (payload: any) => payload.bid,
    },

    // Project update notifications
    projectUpdated: {
      subscribe: (_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) => {
        requireAuth(context)
        return pubsub.subscribe("PROJECT_UPDATED", (payload) => payload.projectId === projectId)
      },
      resolve: (payload: any) => payload.project,
    },

    // Invitation received notifications
    invitationReceived: {
      subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
        const userId = requireAuth(context)
        return pubsub.subscribe("INVITATION_RECEIVED", (payload) => payload.subcontractorId === userId)
      },
      resolve: (payload: any) => payload.invitation,
    },

    // Message notifications
    messageAdded: {
      subscribe: (
        _: unknown,
        { bidId, projectId }: { bidId?: string; projectId?: string },
        context: GraphQLContext,
      ) => {
        const userId = requireAuth(context)
        return pubsub.subscribe("MESSAGE_ADDED", (payload) => {
          const matchesBid = bidId ? payload.bidId === bidId : true
          const matchesProject = projectId ? payload.projectId === projectId : true
          const isRecipient = payload.receiverId === userId
          return matchesBid && matchesProject && isRecipient
        })
      },
      resolve: (payload: any) => payload.message,
    },

    // Notification notifications
    notificationReceived: {
      subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
        const userId = requireAuth(context)
        return pubsub.subscribe("NOTIFICATION_RECEIVED", (payload) => payload.userId === userId)
      },
      resolve: (payload: any) => payload.notification,
    },
  },
}
