import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function Dashboard() {
  const { userId } = await auth()
  
  const user = await prisma.user.findUnique({
    where: { clerkId: userId! },
    include: {
      documents: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your documents and extract information with AI
          </p>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 space-y-3">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Scan New Document
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}