import { NextRequest, NextResponse } from 'next/server';
import { pollGmailInbox } from '../../../lib/gmailParser';

/**
 * GET /api/fetch-emails
 * Returns: [{ id: string, content: string }]
 */
export async function GET() {
  try {
    // pollGmailInbox should return array of { id, content }
    const emails = await pollGmailInbox();
    return NextResponse.json(emails);
  } catch (error: any) {
    console.error('fetch-emails error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}