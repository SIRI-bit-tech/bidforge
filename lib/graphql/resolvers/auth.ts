import type { GraphQLContext } from "../context"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getJWTSecret } from "@/lib/utils/jwt"

export const authResolvers = {
  Mutation: {
    async register(
      _: unknown,
      { input }: { input: { email: string; password: string; name: string; role: "CONTRACTOR" | "SUBCONTRACTOR" } },
      context: GraphQLContext,
    ) {
      // Check if user already exists
      const existingUser = await context.prisma.user.findUnique({
        where: { email: input.email }
      })

      if (existingUser) {
        throw new Error("User with this email already exists")
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10)

      // Create user
      const newUser = await context.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: input.role,
        }
      })

      // Generate JWT token
      const token = jwt.sign({ userId: newUser.id, role: newUser.role }, getJWTSecret(), {
        expiresIn: "30d",
      })

      return {
        token,
        user: newUser,
      }
    },

    async login(_: unknown, { input }: { input: { email: string; password: string } }, context: GraphQLContext) {
      // Find user
      const user = await context.prisma.user.findUnique({
        where: { email: input.email }
      })

      if (!user) {
        throw new Error("Invalid email or password")
      }

      // Verify password
      const valid = await bcrypt.compare(input.password, user.passwordHash)

      if (!valid) {
        throw new Error("Invalid email or password")
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, role: user.role }, getJWTSecret(), {
        expiresIn: "30d",
      })

      return {
        token,
        user,
      }
    },
  },

  Query: {
    async me(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        return null
      }

      const user = await context.prisma.user.findUnique({
        where: { id: context.userId },
        include: {
          company: {
            include: {
              trades: {
                include: {
                  trade: true,
                },
              },
              certifications: true,
              insurance: true,
            },
          },
        },
      })

      return user
    },
  },
}
