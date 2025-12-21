import { createPubSub } from "graphql-yoga"

// Event types for type-safe subscriptions
export type PubSubEvents = {
  // Bid events
  BID_SUBMITTED: { bidId: string; projectId: string; bid: any }
  BID_UPDATED: { bidId: string; bid: any }
  BID_AWARDED: { bidId: string; subcontractorId: string; bid: any }

  // Project events
  PROJECT_UPDATED: { projectId: string; project: any }
  PROJECT_PUBLISHED: { projectId: string; project: any }

  // Invitation events
  INVITATION_RECEIVED: { subcontractorId: string; invitation: any }
  INVITATION_ACCEPTED: { projectId: string; invitation: any }

  // Message events
  MESSAGE_ADDED: { bidId?: string; projectId?: string; receiverId: string; message: any }

  // Notification events
  NOTIFICATION_RECEIVED: { userId: string; notification: any }

  // Document events
  DOCUMENT_ADDED: { projectId: string; document: any }
}

// Create PubSub instance for real-time subscriptions
export const pubsub = createPubSub<PubSubEvents>()
