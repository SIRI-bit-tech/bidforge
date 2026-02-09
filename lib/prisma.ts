import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { withAccelerate } from "@prisma/extension-accelerate"

const prismaClientSingleton = () => {
    const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]

    const dbUrl = process.env.DATABASE_URL

    if (!dbUrl) {
        console.error("DATABASE_URL environment variable is not set")
        throw new Error("DATABASE_URL environment variable is required")
    }

    // Check if using Prisma Accelerate
    if (dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+postgres://')) {
        // Use Accelerate extension with accelerateUrl
        return new PrismaClient({
            log: logLevel,
            accelerateUrl: dbUrl,
        }).$extends(withAccelerate())
    }

    // Use direct PostgreSQL connection with adapter
    const pool = new Pool({ connectionString: dbUrl })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        log: logLevel,
        adapter,
    })
}

type PrismaClientType = ReturnType<typeof prismaClientSingleton>

declare global {
    var prisma: undefined | PrismaClientType
}

const prisma = (globalThis.prisma ?? prismaClientSingleton()) as unknown as PrismaClient

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma as any
