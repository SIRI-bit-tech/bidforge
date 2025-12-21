import { gql } from "urql"

// GraphQL queries and mutations for bids
export const GET_BIDS = gql`
  query GetBids($projectId: ID, $subcontractorId: ID, $status: BidStatus) {
    bids(projectId: $projectId, subcontractorId: $subcontractorId, status: $status) {
      id
      totalAmount
      status
      submittedAt
      validUntil
      notes
      subcontractor {
        id
        name
        company {
          id
          name
          logo
        }
      }
      project {
        id
        title
        location
      }
      lineItems {
        id
        description
        quantity
        unitPrice
        totalPrice
        notes
      }
      alternates {
        id
        description
        adjustmentAmount
        notes
      }
    }
  }
`

export const GET_BID = gql`
  query GetBid($id: ID!) {
    bid(id: $id) {
      id
      totalAmount
      status
      submittedAt
      validUntil
      notes
      subcontractor {
        id
        name
        email
        company {
          id
          name
          logo
          description
        }
      }
      project {
        id
        title
        description
        location
        budget
        deadline
      }
      lineItems {
        id
        description
        quantity
        unitPrice
        totalPrice
        notes
      }
      alternates {
        id
        description
        adjustmentAmount
        notes
      }
    }
  }
`

export const CREATE_BID = gql`
  mutation CreateBid($input: CreateBidInput!) {
    createBid(input: $input) {
      id
      totalAmount
      status
      submittedAt
    }
  }
`

export const UPDATE_BID = gql`
  mutation UpdateBid($id: ID!, $input: UpdateBidInput!) {
    updateBid(id: $id, input: $input) {
      id
      totalAmount
      status
      notes
    }
  }
`

export const SUBMIT_BID = gql`
  mutation SubmitBid($id: ID!) {
    submitBid(id: $id) {
      id
      status
      submittedAt
    }
  }
`

export const WITHDRAW_BID = gql`
  mutation WithdrawBid($id: ID!) {
    withdrawBid(id: $id) {
      id
      status
    }
  }
`

export const AWARD_BID = gql`
  mutation AwardBid($id: ID!) {
    awardBid(id: $id) {
      id
      status
      project {
        id
        status
      }
    }
  }
`
