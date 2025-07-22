import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { TemplateManagement } from '@/components/settings/TemplateManagement'

export default async function Settings() {
  const { userId } = await auth()
  
  const user = await prisma.user.findUnique({
    where: { clerkId: userId! }
  })

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account and application preferences
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{user?.name || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <TemplateManagement />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure your API keys for document processing
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              API key configuration will be added in Phase 6
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}