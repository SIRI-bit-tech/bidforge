require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
})

async function createAdmin() {
  try {
    // Admin user details
    const adminData = {
      email: 'admin@bidforge.com', // Change this to your desired admin email
      name: 'System Administrator',
      password: 'Grace@12', // Change this to a secure password
      role: 'ADMIN'
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(adminData.password, 12)

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: adminData.email,
        role: 'ADMIN'
      }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email)
      return
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        name: adminData.name,
        passwordHash,
        role: adminData.role,
        emailVerified: true
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email:', admin.email)
    console.log('Name:', admin.name)
    console.log('Role:', admin.role)
    console.log('')
    console.log('🔐 Login Credentials:')
    console.log('Email:', adminData.email)
    console.log('Password:', adminData.password)
    console.log('Admin Code: ADMIN2026')
    console.log('')
    console.log('🌐 Admin Login URL: http://localhost:3000/admin')

  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
