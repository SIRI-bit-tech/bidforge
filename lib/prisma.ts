import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

const prismaClientSingleton = () => {
    // For Prisma Accelerate, we need to provide the accelerateUrl
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        // Provide the DATABASE_URL as accelerateUrl for Prisma Accelerate
        accelerateUrl: process.env.DATABASE_URL,
    })
    
    return client.$extends(withAccelerate())
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
