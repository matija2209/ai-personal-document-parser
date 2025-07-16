import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getAuthenticatedUser() {
  const { userId } = await auth()
  if (!userId) return null
  
  return await currentUser()
}

export async function syncUserWithDatabase() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: user.id }
  })

  if (existingUser) {
    return await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName + ' ' + user.lastName,
        imageUrl: user.imageUrl,
        updatedAt: new Date()
      }
    })
  }

  return await prisma.user.create({
    data: {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: user.firstName + ' ' + user.lastName || '',
      imageUrl: user.imageUrl || '',
    }
  })
}