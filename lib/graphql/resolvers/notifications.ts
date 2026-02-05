import { type GraphQLContext, requireAuth } from "../context"

export const notificationResolvers = {
  Query: {
    // Get notifications for current user
    async notifications(_: unknown, { unreadOnly = false }: { unreadOnly?: boolean }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const where: any = { userId }

      if (unreadOnly) {
        where.read = false
      }

      const result = await context.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return result
    },
  },

  Mutation: {
    // Mark notification as read
    async markNotificationAsRead(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.notification.updateMany({
        where: { 
          id, 
          userId 
        },
        data: { read: true }
      })

      if (updated.count === 0) {
        throw new Error("Notification not found or access denied")
      }

      const notification = await context.prisma.notification.findUnique({ where: { id } })
      return notification
    },

    // Mark all notifications as read
    async markAllNotificationsAsRead(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      await context.prisma.notification.updateMany({
        where: { 
          userId, 
          read: false 
        },
        data: { read: true }
      })

      return true
    },
  },
}
