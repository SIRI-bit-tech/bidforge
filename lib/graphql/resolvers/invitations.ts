import { type GraphQLContext, requireAuth, requireRole } from "../context"
import { invitations, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { pubsub } from "../pubsub"
import { sendEmail, emailTemplates } from "@/lib/utils/email"

export const invitationResolvers = {
  Query: {
    // Get all invitations for current user
    async invitations(_: unknown, __: unknown, context: GraphQLContext) {
      const userId = requireAuth(context)

      const result = await context.db.query.invitations.findMany({
        where: eq(invitations.subcontractorId, userId),
        with: {
          project: {
            with: {
              createdBy: {
                with: {
                  company: true,
                },
              },
              trades: {
                with: {
                  trade: true,
                },
              },
            },
          },
        },
        orderBy: (invitations, { desc }) => [desc(invitations.sentAt)],
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
        const [invitation] = await context.db
          .insert(invitations)
          .values({
            projectId,
            subcontractorId,
            status: "PENDING",
          })
          .returning()

        createdInvitations.push(invitation)

        // Create notification for subcontractor
        await context.db.insert(notifications).values({
          userId: subcontractorId,
          type: "INVITATION",
          title: "New Project Invitation",
          message: `You've been invited to bid on ${project.title}`,
          link: `/projects/${projectId}`,
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

      const [updated] = await context.db
        .update(invitations)
        .set({
          status: "ACCEPTED",
          respondedAt: new Date(),
        })
        .where(and(eq(invitations.id, id), eq(invitations.subcontractorId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Invitation not found or access denied")
      }

      // Publish subscription event
      await pubsub.publish("INVITATION_ACCEPTED", {
        projectId: updated.projectId,
        invitation: updated,
      })

      return updated
    },

    // Decline invitation
    async declineInvitation(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      const userId = requireAuth(context)

      const [updated] = await context.db
        .update(invitations)
        .set({
          status: "DECLINED",
          respondedAt: new Date(),
        })
        .where(and(eq(invitations.id, id), eq(invitations.subcontractorId, userId)))
        .returning()

      if (!updated) {
        throw new Error("Invitation not found or access denied")
      }

      return updated
    },
  },
}
