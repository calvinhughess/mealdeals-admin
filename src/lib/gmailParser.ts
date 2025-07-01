import { google } from 'googleapis';
import { load } from 'cheerio';

// Set up OAuth2 client for Gmail.
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set credentials from environment variables
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// Initialize the Gmail API client.
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Configuration
const BATCH_SIZE = 10; // Process 10 emails at a time
const BATCH_DELAY = 2000; // 2 seconds between batches

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Recursively extracts text from a Gmail message payload.
 */
function recurseParts(payload: any, lines: string[]) {
  if (!payload) return;
  const mimeType = payload.mimeType || '';
  const body = payload.body || {};

  if (mimeType.startsWith('text/') && body.data) {
    const base64Url = body.data.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64Url, 'base64').toString('utf-8');
    if (mimeType === 'text/html') {
      const $ = load(decoded);
      const htmlText = $.text();
      lines.push(htmlText);
    } else {
      lines.push(decoded);
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      recurseParts(part, lines);
    }
  }
}

/**
 * Sanitizes email content by removing HTML tags, disclaimers, and extra whitespace.
 */
function sanitizeEmailContent(rawText: string): string {
  let text = rawText.replace(/<[^>]*>/g, ' ');
  const disclaimers = [
    /©\d{4}.*All Rights Reserved\./i,
    /unsubscribe/i,
    /privacy policy/i,
    /terms\s*&\s*conditions/i,
    /add [^ ]+@[^ ]+ to your safe sender list/i,
    /if.*email was forwarded to you/i,
  ];
  disclaimers.forEach(pattern => {
    text = text.replace(pattern, '');
  });
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  const MAX_LENGTH = 4000;
  if (text.length > MAX_LENGTH) {
    text = text.slice(0, MAX_LENGTH);
  }
  return text;
}

/**
 * Extracts and sanitizes text from a Gmail message.
 */
export function extractTextFromMessage(gmailMessage: any): string {
  const lines: string[] = [];
  recurseParts(gmailMessage.payload, lines);
  let combined = lines.join('\n\n');
  return sanitizeEmailContent(combined);
}

/**
 * Process emails in batches to avoid rate limiting
 */
async function processBatch(messages: any[]): Promise<Array<{ id: string; content: string }>> {
  const results: Array<{ id: string; content: string }> = [];
  
  for (const message of messages) {
    try {
      console.log("Processing Gmail message with ID:", message.id);
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      const strippedText = extractTextFromMessage(msgRes.data);
      console.log("Stripped & sanitized text (preview):", strippedText.slice(0, 300));

      results.push({
        id: message.id,
        content: strippedText
      });

      // Mark the message as read to avoid reprocessing.
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      
      // Small delay between individual emails
      await sleep(100);
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      // Continue with next message even if one fails
    }
  }
  
  return results;
}

/**
 * Polls the Gmail inbox for unread messages and processes them in batches.
 * Returns array of { id, content } for processed emails.
 */
export async function pollGmailInbox(): Promise<Array<{ id: string; content: string }>> {
  try {
    console.log("Polling Gmail inbox...");
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox is:unread',
      maxResults: 50, // Limit the number of messages to process in one run
    });
    const messages = res.data.messages || [];
    console.log(`Found ${messages.length} new messages.`);

    const allResults: Array<{ id: string; content: string }> = [];

    // Process messages in batches
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(messages.length / BATCH_SIZE)}`);
      
      const batchResults = await processBatch(batch);
      allResults.push(...batchResults);
      
      // Wait between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < messages.length) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await sleep(BATCH_DELAY);
      }
    }
    
    return allResults;
  } catch (error) {
    console.error("Error polling Gmail:", error);
    throw error;
  }
} 