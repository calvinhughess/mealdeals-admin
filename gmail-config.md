# Gmail API Configuration

## Environment Variables

Add these to your `.env.local` file:

```bash
# Gmail API Configuration
CLIENT_ID=your_gmail_client_id
CLIENT_SECRET=your_gmail_client_secret
REDIRECT_URI=your_redirect_uri
REFRESH_TOKEN=your_refresh_token

# AWS Configuration (for saving deals)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

## Setting Up Gmail API

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API

### 2. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - Your production callback URL
5. Note down the Client ID and Client Secret

### 3. Get Refresh Token
1. Use the OAuth 2.0 Playground or create a simple script
2. Authorize with your Gmail account
3. Exchange authorization code for refresh token
4. Save the refresh token

### 4. Test Configuration
1. Set up all environment variables
2. Run the Gmail import tester
3. Check console logs for any authentication errors

## Gmail API Scopes Required

Make sure your OAuth consent screen includes these scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

## Troubleshooting

### Common Issues
1. **"Invalid credentials"**: Check your CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN
2. **"Access denied"**: Ensure Gmail API is enabled in your Google Cloud project
3. **"Quota exceeded"**: Gmail API has rate limits; the code includes batching to handle this

### Rate Limits
- Gmail API: 1,000,000,000 queries per day
- Per user per second: 250 queries
- The code processes emails in batches of 10 with 2-second delays

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate refresh tokens** periodically
4. **Monitor API usage** in Google Cloud Console 