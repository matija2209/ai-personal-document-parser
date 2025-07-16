import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/prisma'

export async function GET() {
  try {
    const isHealthy = await checkDatabaseHealth()
    
    if (isHealthy) {
      return NextResponse.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    } else {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'disconnected'
        },
        { status: 503 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database health check failed'
      },
      { status: 500 }
    )
  }
}