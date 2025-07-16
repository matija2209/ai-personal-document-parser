import { prisma } from '@/lib/prisma'
import { User } from '@prisma/client'

export async function createUser(
  clerkId: string,
  email: string,
  name?: string,
  imageUrl?: string
): Promise<User> {
  return await prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      imageUrl,
    },
  })
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: {
      clerkId,
    },
  })
}

export async function updateUserPreferences(
  clerkId: string,
  preferences: object
): Promise<User> {
  return await prisma.user.update({
    where: {
      clerkId,
    },
    data: {
      preferences,
    },
  })
}

export async function deleteUser(clerkId: string): Promise<User> {
  return await prisma.user.delete({
    where: {
      clerkId,
    },
  })
}

export async function upsertUser(
  clerkId: string,
  email: string,
  name?: string,
  imageUrl?: string
): Promise<User> {
  return await prisma.user.upsert({
    where: {
      clerkId,
    },
    update: {
      email,
      name,
      imageUrl,
    },
    create: {
      clerkId,
      email,
      name,
      imageUrl,
    },
  })
}