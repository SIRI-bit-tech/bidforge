import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { verifyJWT } from "@/lib/services/auth"

const f = createUploadthing()

const getAuth = async (req: Request) => {
  try {
    const cookieHeader = req.headers.get("cookie") || ""
    const match = /auth-token=([^;]+)/.exec(cookieHeader)
    const token = match?.[1]

    if (!token) {
      return null
    }

    const payload = verifyJWT(token)

    if (!payload) {
      return null
    }

    return { userId: payload.userId }
  } catch (error) {
    console.error("UploadThing auth error:", error)
    return null
  }
}

export const ourFileRouter = {
  projectImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const auth = await getAuth(req)
      return {
        userId: auth?.userId ?? "anonymous",
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        url: file.url,
        uploadedBy: metadata.userId,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    }),

  projectDocument: f({ blob: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      const auth = await getAuth(req)
      return {
        userId: auth?.userId ?? "anonymous",
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        url: file.url,
        uploadedBy: metadata.userId,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    }),

  messageAttachment: f({ blob: { maxFileSize: "16MB", maxFileCount: 5 } })
    .middleware(async ({ req }) => {
      const auth = await getAuth(req)
      return {
        userId: auth?.userId ?? "anonymous",
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        url: file.url,
        uploadedBy: metadata.userId,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
