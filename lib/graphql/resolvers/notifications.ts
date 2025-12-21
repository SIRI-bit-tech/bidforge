import { type GraphQLContext, requireAuth } from "../context"
import { notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export const notificationResolvers = {
  Query: {
    // Get notifications for current user
    async notifications(_: unknown, { unreadOnly = false }: { unreadOnly?: boolean }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const conditions = [eq(notifications.userId, userId)]

      if (unreadOnly) {
        conditions.push(eq(notifications.read, false))
      }

      const result = await context.db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
        limit: 50,
      })

      return result
    },
  },

  Mutation: {
    // Mark notification as read
    async markNotificationAsRead(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Notification not found or access denied")
      }

      return updated
    },

    // Mark all notifications as read
    async markAllNotificationsAsRead(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      await context.db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

      return true
    },
  },
}
