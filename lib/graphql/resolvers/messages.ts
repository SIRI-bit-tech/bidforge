import { type GraphQLContext, requireAuth } from "../context"
import { messages } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import { pubsub } from "../pubsub"

export const messageResolvers = {
  Query: {
    // Get messages for a project or bid
    async messages(_: unknown, { projectId, bidId }: { projectId?: string; bidId?: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const conditions = []

      if (projectId) {
        conditions.push(eq(messages.projectId, projectId))
      }

      if (bidId) {
        conditions.push(eq(messages.bidId, bidId))
      }

      // Only show messages where user is sender or receiver
      conditions.push(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))

      const result = await context.db.query.messages.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          sender: {
            with: {
              company: true,
            },
          },
          receiver: {
            with: {
              company: true,
            },
          },
          project: true,
          bid: true,
        },
        orderBy: (messages, { asc }) => [asc(messages.sentAt)],
      })

      return result
    },
  },

  Mutation: {
    // Send a message
    async sendMessage(
      _: unknown,
      { projectId, bidId, receiverId, text }: { projectId?: string; bidId?: string; receiverId: string; text: string },
      context: GraphQLContext,
    ) {
      const userId = requireAuth(context)

      const [message] = await context.db
        .insert(messages)
        .values({
          projectId,
          bidId,
          senderId: userId,
          receiverId,
          text,
        })
        .returning()

      // Publish subscription event
      await pubsub.publish("MESSAGE_ADDED", {
        projectId,
        bidId,
        receiverId,
        message,
      })

      return message
    },

    // Mark message as read
    async markMessageAsRead(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(messages)
        .set({ read: true })
        .where(and(eq(messages.id, id), eq(messages.receiverId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Message not found or access denied")
      }

      return updated
    },
  },
}
