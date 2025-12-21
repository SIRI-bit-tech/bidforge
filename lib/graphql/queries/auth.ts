import { gql } from "urql"

// Authentication queries and mutations
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
        company {
          id
          name
          type
          logo
        }
      }
    }
  }
`

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`

export const ME = gql`
  query Me {
    me {
      id
      name
      email
      role
      company {
        id
        name
        type
        logo
        address
        phone
        website
        description
        trades
      }
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      name
      email
    }
  }
`
