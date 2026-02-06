import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

const prismaClientSingleton = () => {
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL
    const logLevel = process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]

    if (accelerateUrl) {
        const client = new PrismaClient({
            log: logLevel as any,
            datasources: {
                db: {
                    url: accelerateUrl,
                },
            },
        } as any)
        return client.$extends(withAccelerate())
    }

    return new PrismaClient({
        log: logLevel as any,
    })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
