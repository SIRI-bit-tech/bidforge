import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
    const logLevel: Prisma.LogLevel[] = process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        log: logLevel,
        adapter,
    })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
