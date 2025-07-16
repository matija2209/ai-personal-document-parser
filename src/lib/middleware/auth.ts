import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function requireAuth(): Promise<string | NextResponse> {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return userId;
}

export async function getOptionalAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}

export function createAuthHeader(userId: string) {
  return {
    'X-User-ID': userId,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return Boolean(userId);
}