import { type GraphQLContext, requireAuth, requireRole } from "../context"
import { pubsub } from "../pubsub"
import { sendEmail, emailTemplates } from "@/lib/utils/email"

export const invitationResolvers = {
  Query: {
    // Get all invitations for current user
    async invitations(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      const result = await context.prisma.invitation.findMany({
        where: { subcontractorId: userId },
        include: {
          project: {
            include: {
              createdBy: {
                include: {
                  company: true,
                },
              },
              trades: {
                include: {
                  trade: true,
                },
              },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      })

      return result
    },
  },

  Mutation: {
    // Invite subcontractors to bid on project
    async inviteSubcontractors(
      _: unknown,
      { projectId, subcontractorIds }: { projectId: string; subcontractorIds: string[] },
      context: GraphQLContext,
    ) {
      const userId = requireAuth(context)
      requireRole(context, "CONTRACTOR")

      // Verify project ownership
      const project = await context.loaders.project.load(projectId)
      if (!project || project.createdById !== userId) {
        throw new Error("Project not found or access denied")
      }

      // Create invitations
      const createdInvitations = []
      for (const subcontractorId of subcontractorIds) {
        const invitation = await context.prisma.invitation.create({
          data: {
            projectId,
            subcontractorId,
            status: "PENDING",
          },
        })

        createdInvitations.push(invitation)

        // Create notification for subcontractor
        await context.prisma.notification.create({
          data: {
            userId: subcontractorId,
            type: "INVITATION",
            title: "New Project Invitation",
            message: `You've been invited to bid on ${project.title}`,
            link: `/projects/${projectId}`,
          },
        })

        // Publish subscription event
        await pubsub.publish("INVITATION_RECEIVED", {
          subcontractorId,
          invitation,
        })

        // Send email notification
        const subcontractor = await context.loaders.user.load(subcontractorId)
        if (subcontractor) {
          const contractor = await context.loaders.user.load(userId)
          const emailContent = emailTemplates.projectInvitation({
            subcontractorName: subcontractor.name,
            projectTitle: project.title,
            deadline: project.deadline,
            contractorName: contractor?.name || "Unknown",
            projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
          })

          await sendEmail({
            to: subcontractor.email,
            ...emailContent,
          })
        }
      }

      return createdInvitations
    },

    // Accept invitation
    async acceptInvitation(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.invitation.updateMany({
        where: {
          id,
          subcontractorId: userId,
        },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      })

      if (updated.count === 0) {
        throw new Error("Invitation not found or access denied")
      }

      const invitation = await context.prisma.invitation.findUnique({
        where: { id },
      })

      // Publish subscription event
      await pubsub.publish("INVITATION_ACCEPTED", {
        projectId: invitation?.projectId,
        invitation,
      })

      return invitation
    },

    // Decline invitation
    async declineInvitation(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const updated = await context.prisma.invitation.updateMany({
        where: {
          id,
          subcontractorId: userId,
        },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
        },
      })

      if (updated.count === 0) {
        throw new Error("Invitation not found or access denied")
      }

      const invitation = await context.prisma.invitation.findUnique({
        where: { id },
      })

      return invitation
    },
  },
}
