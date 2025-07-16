# Phase 3: Authentication Integration - Detailed Implementation Plan

## Overview
Implement user authentication using Clerk.io with Next.js 15 App Router, including user session management, protected routes, and database user synchronization.

## Pre-requisites
- Phase 1 (Project Foundation) completed
- Phase 2 (Database Schema) completed
- Clerk.io account created
- Environment variables configured

---

## Step-by-Step Implementation

### **Step 1: Install Dependencies**
```bash
npm install @clerk/nextjs@latest
```

**Expected files created/modified:**
- `package.json` - Updated with Clerk dependency
- `package-lock.json` - Updated lockfile

---

### **Step 2: Environment Variables Setup**

**File: `.env.local`**
Add these variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**File: `.env.example`**
Add these variables as examples:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**Success criteria:**
- Environment variables are properly configured
- Keys are obtained from Clerk dashboard
- URLs point to correct routes

---

### **Step 3: Root Layout Configuration**

**File: `app/layout.tsx`**
Wrap the application with ClerkProvider:

```typescript
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Success criteria:**
- ClerkProvider wraps the entire app
- No TypeScript errors
- App still builds successfully

---

### **Step 4: Middleware Setup for Route Protection**

**File: `middleware.ts` (in project root)**
Create middleware for protecting routes:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/camera(.*)',
  '/results(.*)',
  '/settings(.*)',
  '/history(.*)',
  '/profile(.*)'
])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
```

**Success criteria:**
- Middleware file exists in project root
- Protected routes are properly defined
- Middleware runs without errors

---

### **Step 5: Authentication Pages**

**File: `app/sign-in/[[...sign-in]]/page.tsx`**
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn />
    </div>
  )
}
```

**File: `app/sign-up/[[...sign-up]]/page.tsx`**
```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp />
    </div>
  )
}
```

**Success criteria:**
- Sign-in and sign-up pages render Clerk components
- Pages are accessible at `/sign-in` and `/sign-up`
- Styling matches app design

---

### **Step 6: Database User Synchronization**

**File: `lib/auth.ts`**
Create auth utility functions:

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getAuthenticatedUser() {
  const { userId } = auth()
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
    // Update user if necessary
    return await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName + ' ' + user.lastName,
        profileImageUrl: user.imageUrl,
        updatedAt: new Date()
      }
    })
  }

  // Create new user
  return await prisma.user.create({
    data: {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: user.firstName + ' ' + user.lastName || '',
      profileImageUrl: user.imageUrl || '',
    }
  })
}
```

**Success criteria:**
- Auth utilities work correctly
- Database sync function handles both creation and updates
- Error handling for missing user data

---

### **Step 7: Webhook Setup for User Management**

**File: `app/api/webhooks/clerk/route.ts`**
Create webhook to handle user events:

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  switch (evt.type) {
    case 'user.created':
      await prisma.user.create({
        data: {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address || '',
          name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
          profileImageUrl: evt.data.image_url || '',
        }
      })
      break
    
    case 'user.updated':
      await prisma.user.update({
        where: { clerkId: evt.data.id },
        data: {
          email: evt.data.email_addresses[0]?.email_address || '',
          name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
          profileImageUrl: evt.data.image_url || '',
          updatedAt: new Date()
        }
      })
      break
    
    case 'user.deleted':
      await prisma.user.delete({
        where: { clerkId: evt.data.id }
      })
      break
  }

  return new Response('', { status: 200 })
}
```

**Additional environment variable needed:**
```
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Success criteria:**
- Webhook endpoint handles user creation, updates, and deletion
- Database stays in sync with Clerk user changes
- Webhook secret is properly configured

---

### **Step 8: Navigation Component with User Profile**

**File: `components/Navigation.tsx`**
```typescript
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Document Scanner
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <SignedIn>
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/settings" className="text-gray-700 hover:text-gray-900">
                Settings
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            
            <SignedOut>
              <SignInButton>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**Success criteria:**
- Navigation shows user profile when signed in
- Sign in/out functionality works
- Links to protected routes are available

---

### **Step 9: Protected Route Layout**

**File: `app/(protected)/layout.tsx`**
```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
```

**Move protected routes to `app/(protected)/` directory:**
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/settings/page.tsx`
- `app/(protected)/camera/page.tsx`
- `app/(protected)/results/page.tsx`
- `app/(protected)/history/page.tsx`

**Success criteria:**
- Protected routes are properly organized
- Layout includes navigation
- Authentication is enforced

---

### **Step 10: Dashboard Page (Basic)**

**File: `app/(protected)/dashboard/page.tsx`**
```typescript
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function Dashboard() {
  const { userId } = auth()
  
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
```

**Success criteria:**
- Dashboard displays user information
- User data is fetched from database
- Page renders correctly for authenticated users

---

### **Step 11: Settings Page**

**File: `app/(protected)/settings/page.tsx`**
```typescript
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function Settings() {
  const { userId } = auth()
  
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
```

**Success criteria:**
- Settings page displays user profile information
- Placeholder for API configuration exists
- Page is accessible only to authenticated users

---

### **Step 12: Error Handling & Loading States**

**File: `components/AuthErrorBoundary.tsx`**
```typescript
'use client'

import { useEffect } from 'react'

interface AuthErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthErrorBoundary({ error, reset }: AuthErrorBoundaryProps) {
  useEffect(() => {
    console.error('Authentication error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Authentication Error
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          There was a problem with authentication. Please try again.
        </p>
        <button
          onClick={reset}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
```

**File: `app/(protected)/error.tsx`**
```typescript
'use client'

import AuthErrorBoundary from '@/components/AuthErrorBoundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <AuthErrorBoundary error={error} reset={reset} />
}
```

**Success criteria:**
- Error boundaries handle authentication errors gracefully
- Users get helpful error messages
- Recovery mechanism exists

---

### **Step 13: Social Login Configuration (Optional)**

**Clerk Dashboard Setup:**
1. Go to Clerk Dashboard → SSO Connections
2. Click "Add connection" → "For all users"
3. Select providers to enable:
   - Google (most common)
   - GitHub (for developers)
   - Apple (for iOS users)

**Common providers available:**
- Google
- GitHub
- Apple
- Microsoft
- Discord
- Facebook
- Twitter/X
- LinkedIn

**Success criteria:**
- Social login buttons appear on sign-in/sign-up pages
- Users can authenticate with chosen providers
- Social accounts sync properly with database

---

### **Step 14: Testing & Validation**

**Manual Testing Checklist:**
- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] User can sign out
- [ ] Protected routes redirect to sign-in when not authenticated
- [ ] Protected routes are accessible when authenticated
- [ ] User profile appears in navigation
- [ ] Dashboard displays user information
- [ ] Settings page shows profile data
- [ ] Database user sync works correctly
- [ ] Webhook handles user events (test in Clerk dashboard)
- [ ] Error boundaries handle auth failures
- [ ] Social login works (if enabled)

**Success criteria:**
- All manual tests pass
- No console errors
- Authentication flow is smooth
- Database stays in sync

---

## Final Phase 3 Deliverables

### **Files Created:**
- `middleware.ts` - Route protection
- `app/sign-in/[[...sign-in]]/page.tsx` - Sign-in page
- `app/sign-up/[[...sign-up]]/page.tsx` - Sign-up page
- `app/(protected)/layout.tsx` - Protected route layout
- `app/(protected)/dashboard/page.tsx` - Dashboard page
- `app/(protected)/settings/page.tsx` - Settings page
- `app/api/webhooks/clerk/route.ts` - Webhook handler
- `components/Navigation.tsx` - Navigation with user profile
- `components/AuthErrorBoundary.tsx` - Error handling
- `lib/auth.ts` - Auth utilities

### **Files Modified:**
- `app/layout.tsx` - Added ClerkProvider
- `.env.local` - Added Clerk environment variables
- `.env.example` - Added example environment variables
- `package.json` - Added Clerk dependency

### **Environment Variables Added:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### **Success Criteria Met:**
- ✅ Users can sign up and sign in successfully
- ✅ Protected routes work properly
- ✅ User sessions persist across page refreshes
- ✅ Database user sync is working
- ✅ Error handling is comprehensive
- ✅ Navigation includes user profile
- ✅ Social login is optional but available

---

## Next Steps
Phase 3 provides the foundation for user authentication. Phase 4 will build upon this by adding camera functionality that requires user authentication to access.