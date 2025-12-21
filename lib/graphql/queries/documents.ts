import { gql } from "urql"

// Document queries and mutations
export const GET_DOCUMENTS = gql`
  query GetDocuments($projectId: ID!) {
    documents(projectId: $projectId) {
      id
      name
      type
      url
      size
      uploadedAt
      uploadedBy {
        id
        name
      }
    }
  }
`

export const UPLOAD_DOCUMENT = gql`
  mutation UploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      id
      name
      url
      type
      size
    }
  }
`

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`
