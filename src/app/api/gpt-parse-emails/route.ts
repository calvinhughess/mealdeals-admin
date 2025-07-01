import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

type ParsedEmail = { id: string; parsed: string };
type Deal = {
  expiryDate: string;
  company: string;
  description: string;
  redemptionMethod: string;
  discountAmount: string;
  additionalInfo: string;
  category: 'reward' | 'universal';
};

/**
 * Sleep function for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls ChatGPT with exponential backoff retry logic
 */
async function callChatGPTWithRetry(emailContent: string, maxRetries = 3): Promise<string> {
  const prompt = `
You are a specialized assistant that extracts detailed deal information from promotional emails.
Your task is to parse the provided email content and output ONLY valid JSON with no extra formatting.
The JSON must be an array of deal objects, where each deal object includes exactly the following keys:
- "expiryDate": The expiration date of the deal in ISO 8601 format if mentioned; otherwise, an empty string.
- "company": The normalized name of the company offering the deal.
- "description": A concise summary of the deal offer.
- "redemptionMethod": A clear explanation of how to redeem the deal (e.g., "Redeem via website", "In-store", "Use code XYZ", "Through the app").
- "discountAmount": The discount value (e.g., "20%" or "$5 off"); if not provided, return an empty string.
- "additionalInfo": Any extra details (such as "terms apply"); if none, return an empty string.
- "category": Set to "reward" if the deal is exclusive to rewards members, or "universal" if available to all customers.

Rules:
1. Only include actual deals; ignore generic or non-deal text (disclaimers, unsubscribe info, etc.).
2. Extract deal details even if they are mentioned in the email footer.
3. If multiple expiration dates are present, choose the one that most likely represents the deal's expiration.
4. Remove duplicate deals.
5. If no deals are found, output an empty JSON array: [].
6. Output ONLY the JSON array with no extra text or markdown formatting.

Email content:
${emailContent}
`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts structured deal information from promotional emails.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      return response.data.choices[0].message.content;
      
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data?.error || error.message
      });
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(Math.pow(2, attempt) * 1000, 60000);
        
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        
        if (attempt < maxRetries - 1) {
          await sleep(waitTime);
          continue;
        }
      }
      
      // Handle other errors
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff for other errors
      const backoffTime = Math.min(Math.pow(2, attempt) * 1000, 30000);
      console.log(`Waiting ${backoffTime}ms before retry...`);
      await sleep(backoffTime);
    }
  }
  
  throw new Error('All retry attempts failed');
}

/**
 * Check if email is a system email that should be skipped
 */
function isSystemEmail(emailContent: string): boolean {
  const systemEmailPatterns = [
    /was granted access to your Google Account/i,
    /important changes to your Google Account/i,
    /verify your email address/i,
    /reset your password/i,
    /security alert/i,
    /Welcome to/i,
    /Thank you for signing up/i,
  ];
  
  return systemEmailPatterns.some(pattern => pattern.test(emailContent));
}

/**
 * Deduplicates deal objects by constructing a unique key from normalized fields.
 */
function deduplicateDeals(dealsArray: Deal[]): Deal[] {
  const uniqueDealsMap = new Map();
  for (const deal of dealsArray) {
    const key = `${(deal.company || '').trim().toLowerCase()}|${(deal.expiryDate || '').trim()}|${(deal.discountAmount || '').trim()}|${(deal.redemptionMethod || '').trim().toLowerCase()}`;
    if (!uniqueDealsMap.has(key)) {
      uniqueDealsMap.set(key, deal);
    }
  }
  return Array.from(uniqueDealsMap.values());
}

/**
 * POST /api/gpt-parse-emails
 * Body: { parsed: ParsedEmail[] }
 * Returns: Deal[] - Array of extracted deals
 */
export async function POST(request: NextRequest) {
  try {
    const { parsed } = await request.json() as { parsed: ParsedEmail[] };
    
    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const allDeals: Deal[] = [];

    for (const email of parsed) {
      try {
        // Skip system emails to save API calls
        if (isSystemEmail(email.parsed)) {
          console.log(`Skipping system email ${email.id} (not a deal email)`);
          continue;
        }

        // Call ChatGPT with retry logic
        console.log(`Calling ChatGPT API for email ${email.id}...`);
        const llmOutput = await callChatGPTWithRetry(email.parsed);
        console.log(`Raw ChatGPT output for ${email.id}:`, llmOutput);

        // Remove any markdown formatting
        let cleanedOutput = llmOutput
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        // Parse the cleaned output as JSON
        let deals: Deal[] = [];
        try {
          deals = JSON.parse(cleanedOutput);
          if (!Array.isArray(deals)) {
            deals = [deals];
          }
        } catch (jsonError) {
          console.error(`Error parsing ChatGPT output as JSON for ${email.id}:`, jsonError);
          console.error("Cleaned output was:", cleanedOutput);
          
          // Try to extract JSON from the output
          const jsonMatch = cleanedOutput.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              deals = JSON.parse(jsonMatch[0]);
            } catch (secondError) {
              console.error(`Failed to extract JSON from output for ${email.id}`);
              continue; // Skip this email and continue with others
            }
          } else {
            console.error(`No JSON array found in ChatGPT output for ${email.id}`);
            continue; // Skip this email and continue with others
          }
        }

        allDeals.push(...deals);
        
        // Small delay between API calls to avoid rate limiting
        await sleep(1000);
        
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        // Continue with other emails even if one fails
      }
    }

    // Deduplicate all deals
    const uniqueDeals = deduplicateDeals(allDeals);
    console.log("Total unique deals found:", uniqueDeals.length);
    
    return NextResponse.json(uniqueDeals);
  } catch (error: any) {
    console.error('gpt-parse-emails error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse emails with GPT' },
      { status: 500 }
    );
  }
} 