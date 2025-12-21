import { gql } from "urql"

// GraphQL queries for projects
export const GET_PROJECTS = gql`
  query GetProjects($filter: ProjectFilterInput, $limit: Int, $offset: Int) {
    projects(filter: $filter, limit: $limit, offset: $offset) {
      id
      title
      description
      location
      budget
      status
      deadline
      createdAt
      createdBy {
        id
        name
        company {
          name
        }
      }
      trades {
        id
        name
      }
      _count {
        bids
      }
    }
  }
`

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      title
      description
      location
      budget
      startDate
      endDate
      deadline
      status
      createdAt
      updatedAt
      createdBy {
        id
        name
        email
        company {
          name
          logo
        }
      }
      trades {
        id
        name
        category
      }
      bids {
        id
        totalAmount
        status
        submittedAt
        subcontractor {
          id
          name
          company {
            name
            logo
          }
        }
      }
      documents {
        id
        name
        type
        url
        size
        uploadedAt
      }
    }
  }
`

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      title
      status
    }
  }
`
