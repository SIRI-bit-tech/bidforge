import { type GraphQLContext, requireAuth } from "../context"
import { pubsub } from "../pubsub"

export const messageResolvers = {
  Query: {
    // Get messages for a project or bid
    async messages(_: unknown, { projectId, bidId }: { projectId?: string; bidId?: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const where: any = {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }

      if (projectId) {
        where.projectId = projectId
      }

      if (bidId) {
        where.bidId = bidId
      }

      const result = await context.prisma.message.findMany({
        where,
        include: {
          sender: {
            include: {
              company: true,
            },
          },
          receiver: {
            include: {
              company: true,
            },
          },
          project: true,
          bid: true,
        },
        orderBy: { sentAt: 'asc' },
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

      const message = await context.prisma.message.create({
        data: {
          projectId,
          bidId,
          senderId: userId,
          receiverId,
          text,
        }
      })

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

      const updated = await context.prisma.message.updateMany({
        where: { 
          id, 
          receiverId: userId 
        },
        data: { read: true }
      })

      if (updated.count === 0) {
        throw new Error("Message not found or access denied")
      }

      const message = await context.prisma.message.findUnique({ where: { id } })
      return message
    },
  },
}
