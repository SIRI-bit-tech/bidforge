import { type GraphQLContext, requireAuth } from "../context"
import { pubsub } from "../pubsub"

export const documentResolvers = {
  Query: {
    // Get documents for a project
    async documents(_: unknown, { projectId }: { projectId: string }, context: GraphQLContext) {
      requireAuth(context)

      const result = await context.prisma.document.findMany({
        where: { projectId },
        include: {
          uploadedBy: {
            include: {
              company: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      })

      return result
    },
  },

  Mutation: {
    // Upload document
    async uploadDocument(
      _: unknown,
      { projectId, file, type }: { projectId: string; file: any; type: string },
      context: GraphQLContext,
    ) {
      const userId = requireAuth(context)

      // Verify project access
      const project = await context.loaders.project.load(projectId)
      if (!project) {
        throw new Error("Project not found")
      }

      // In production, upload to S3/R2 and get URL
      // For now, we'll simulate the upload
      const fileName = file.name || "document.pdf"
      const fileSize = file.size || 0
      const fileUrl = `https://storage.bidforge.com/projects/${projectId}/${Date.now()}-${fileName}`

      const document = await context.prisma.document.create({
        data: {
          projectId,
          name: fileName,
          type: type as "BLUEPRINT" | "SPECIFICATION" | "CONTRACT" | "ADDENDUM" | "PHOTO" | "OTHER",
          url: fileUrl,
          size: fileSize,
          uploadedById: userId,
          version: 1,
        },
      })

      // Publish subscription event
      await pubsub.publish("DOCUMENT_ADDED", {
        projectId,
        document,
      })

      return document
    },

    // Delete document
    async deleteDocument(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      // Verify ownership
      const document = await context.prisma.document.findFirst({
        where: { id },
        include: {
          project: true,
        },
      })

      if (!document || document.project?.createdById !== userId) {
        throw new Error("Document not found or access denied")
      }

      await context.prisma.document.delete({
        where: { id },
      })

      // In production, also delete from S3/R2

      return true
    },
  },
}
