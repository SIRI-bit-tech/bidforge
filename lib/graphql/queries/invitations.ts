import { gql } from "urql"

// Invitation queries and mutations
export const GET_INVITATIONS = gql`
  query GetInvitations($subcontractorId: ID, $projectId: ID, $status: InvitationStatus) {
    invitations(subcontractorId: $subcontractorId, projectId: $projectId, status: $status) {
      id
      status
      sentAt
      respondedAt
      message
      project {
        id
        title
        description
        location
        budget
        deadline
        trades {
          id
          name
        }
      }
      subcontractor {
        id
        name
        company {
          name
        }
      }
    }
  }
`

export const INVITE_SUBCONTRACTORS = gql`
  mutation InviteSubcontractors($projectId: ID!, $subcontractorIds: [ID!]!, $message: String) {
    inviteSubcontractors(projectId: $projectId, subcontractorIds: $subcontractorIds, message: $message) {
      id
      status
      sentAt
    }
  }
`

export const RESPOND_TO_INVITATION = gql`
  mutation RespondToInvitation($id: ID!, $accept: Boolean!) {
    respondToInvitation(id: $id, accept: $accept) {
      id
      status
      respondedAt
    }
  }
`
