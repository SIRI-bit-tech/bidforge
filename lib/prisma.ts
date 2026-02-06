import { PrismaClient, Prisma } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

// Define the extended client type once
const baseClientForType = new PrismaClient()
const extendedClientForType = baseClientForType.$extends(withAccelerate())
export type ExtendedPrismaClient = typeof extendedClientForType

const prismaClientSingleton = (): ExtendedPrismaClient => {
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL
    const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]

    if (accelerateUrl) {
        return new PrismaClient({
            log: logLevel,
            datasources: {
                db: {
                    url: accelerateUrl,
                },
            },
        } as any).$extends(withAccelerate()) as unknown as ExtendedPrismaClient
    }

    // Always cast to the extended type to maintain consistent typing throughout the app
    return new PrismaClient({
        log: logLevel,
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    } as any) as unknown as ExtendedPrismaClient
}

declare global {
    var prisma: undefined | ExtendedPrismaClient
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
