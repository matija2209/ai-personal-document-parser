import { NextResponse } from 'next/server'
import { 
  createUser, 
  getUserByClerkId, 
  createDocument, 
  getDocumentById,
  createDocumentFile,
  createExtraction,
  logError 
} from '@/lib/database'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    await prisma.$queryRaw`SELECT 1`
    
    const testClerkId = `test_${Date.now()}`
    const testEmail = `test-${Date.now()}@example.com`
    
    const user = await createUser(
      testClerkId,
      testEmail,
      'Test User',
      'https://example.com/avatar.jpg'
    )
    
    const document = await createDocument(
      user.clerkId,
      'driving_license',
      30
    )
    
    const documentFile = await createDocumentFile(
      document.id,
      user.clerkId,
      `file_${Date.now()}`,
      '/path/to/file.jpg',
      'front',
      'license_front.jpg',
      512000,
      1024000,
      'image/jpeg'
    )
    
    const extraction = await createExtraction(
      document.id,
      'gemini-flash',
      { name: 'John Doe', license_number: '123456789' },
      ['license_number'],
      0.95,
      1500
    )
    
    const error = await logError(
      document.id,
      'ai_processing',
      'Test error message',
      'extraction_step',
      { details: 'Test error details' }
    )
    
    const retrievedDocument = await getDocumentById(document.id)
    const retrievedUser = await getUserByClerkId(user.clerkId)
    
    await prisma.user.delete({ where: { clerkId: testClerkId } })
    
    return NextResponse.json({
      success: true,
      message: 'All database operations completed successfully',
      results: {
        user: !!retrievedUser,
        document: !!retrievedDocument,
        documentFile: !!documentFile,
        extraction: !!extraction,
        error: !!error,
        cleanup: 'completed'
      }
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}