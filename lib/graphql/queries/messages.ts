import { gql } from "urql"

// Message queries and mutations
export const GET_MESSAGES = gql`
  query GetMessages($projectId: ID!) {
    messages(projectId: $projectId) {
      id
      text
      sentAt
      read
      sender {
        id
        name
        company {
          name
        }
      }
      receiver {
        id
        name
      }
    }
  }
`

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      text
      sentAt
      sender {
        id
        name
      }
    }
  }
`

export const MARK_MESSAGE_READ = gql`
  mutation MarkMessageRead($id: ID!) {
    markMessageRead(id: $id) {
      id
      read
    }
  }
`
