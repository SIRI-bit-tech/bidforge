import { gql } from "urql"

// Company queries and mutations
export const GET_SUBCONTRACTORS = gql`
  query GetSubcontractors($trade: String, $search: String) {
    subcontractors(trade: $trade, search: $search) {
      id
      name
      email
      company {
        id
        name
        type
        logo
        description
        trades
        address
        phone
        website
      }
    }
  }
`

export const UPDATE_COMPANY = gql`
  mutation UpdateCompany($id: ID!, $input: UpdateCompanyInput!) {
    updateCompany(id: $id, input: $input) {
      id
      name
      type
      logo
      description
      address
      phone
      website
      trades
    }
  }
`
