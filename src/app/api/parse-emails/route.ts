import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromMessage } from '../../../lib/gmailParser';

type EmailContent = { id: string; content: string };
type ParsedEmail = { id: string; parsed: string };

/**
 * POST /api/parse-emails
 * Body: { emails: EmailContent[] }
 * Returns: [{ id, parsed }] where parsed is sanitized text
 */
export async function POST(request: NextRequest) {
  try {
    const { emails } = await request.json() as { emails: EmailContent[] };
    
    if (!Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const parsed: ParsedEmail[] = emails.map(e => ({
      id: e.id,
      parsed: extractTextFromMessage({ 
        payload: { 
          parts: [{ 
            body: { 
              data: Buffer.from(e.content).toString('base64') 
            } 
          }] 
        } 
      } as any)
    }));
    
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('parse-emails error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse emails' },
      { status: 500 }
    );
  }
}