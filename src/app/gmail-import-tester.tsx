'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

// Helper function to safely format dates
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'No date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

interface Deal {
  expiryDate: string;
  company: string;
  description: string;
  redemptionMethod: string;
  discountAmount: string;
  additionalInfo: string;
  category: 'reward' | 'universal';
}

type EmailContent = { id: string; content: string };
type ParsedEmail = { id: string; parsed: any };
type GPTParsedEmail = Deal[];

export default function GmailImportTester() {
  // Step states
  const [rawEmails, setRawEmails] = useState<EmailContent[]>([]);
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [gptParsed, setGptParsed] = useState<GPTParsedEmail>([]);
  const [status, setStatus] = useState<string>('');

  // Step 1: Fetch raw emails
  const fetchEmails = async () => {
    setStatus('Fetching raw emails...');
    try {
      const res = await axios.get<EmailContent[]>('/api/fetch-emails');
      setRawEmails(res.data);
      setStatus(`Fetched ${res.data.length} emails.`);
    } catch (err) {
      console.error(err);
      setStatus('Failed to fetch emails.');
    }
  };

  // Step 2: Parse emails locally
  const parseEmails = async () => {
    setStatus('Parsing emails...');
    try {
      const res = await axios.post<ParsedEmail[]>('/api/parse-emails', { emails: rawEmails });
      setParsedEmails(res.data);
      setStatus(`Parsed ${res.data.length} emails.`);
    } catch (err) {
      console.error(err);
      setStatus('Failed to parse emails.');
    }
  };

  // Step 3: GPT parse
  const gptParse = async () => {
    setStatus('Running GPT parse...');
    try {
      const res = await axios.post<GPTParsedEmail>('/api/gpt-parse-emails', { parsed: parsedEmails });
      setGptParsed(res.data);
      setStatus(`GPT parsed ${res.data.length} deals.`);
    } catch (err) {
      console.error(err);
      setStatus('GPT parsing failed.');
    }
  };

  // Step 4: Save to DB
  const saveDeals = async () => {
    setStatus('Saving deals to database...');
    try {
      await axios.post('/api/save-deals', { deals: gptParsed });
      setStatus('Deals saved successfully.');
    } catch (err) {
      console.error(err);
      setStatus('Failed to save deals.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-extrabold mb-6">Gmail Import Tester</h1>

      {/* Multi-step Controls */}
      <div className="space-y-4 mb-8">
        <div className="flex space-x-4">
          <button onClick={fetchEmails} className="px-4 py-2 bg-blue-500 text-white rounded">1. Fetch Emails</button>
          <button onClick={parseEmails} className="px-4 py-2 bg-blue-500 text-white rounded" disabled={!rawEmails.length}>2. Parse Emails</button>
          <button onClick={gptParse} className="px-4 py-2 bg-blue-500 text-white rounded" disabled={!parsedEmails.length}>3. GPT Parse</button>
          <button onClick={saveDeals} className="px-4 py-2 bg-green-600 text-white rounded" disabled={!gptParsed.length}>4. Save to DB</button>
        </div>
        {status && <div className="text-sm text-gray-700">{status}</div>}
      </div>

      {/* Raw Emails Preview */}
      {rawEmails.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Raw Emails ({rawEmails.length})</h2>
          <div className="grid gap-4">
            {rawEmails.map(email => (
              <div key={email.id} className="bg-white p-4 rounded shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Email ID: {email.id}</span>
                  <span className="text-xs text-gray-500">{email.content.length} characters</span>
                </div>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                  {email.content}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parsed Emails Preview */}
      {parsedEmails.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Parsed Emails ({parsedEmails.length})</h2>
          <div className="space-y-4">
            {parsedEmails.map(pe => (
              <div key={pe.id} className="bg-white p-4 rounded shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Email ID: {pe.id}</span>
                  <span className="text-xs text-gray-500">{pe.parsed.length} characters</span>
                </div>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                  {pe.parsed}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GPT Parsed Deals Preview */}
      {gptParsed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">GPT Parsed Deals ({gptParsed.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gptParsed.map((deal, index) => (
              <div key={index} className="bg-white p-4 rounded shadow">
                <h3 className="font-bold">{deal.company}</h3>
                <p className="text-sm text-gray-600">{deal.category}</p>
                <p className="mt-2 text-sm">{deal.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <div>Discount: {deal.discountAmount || 'N/A'}</div>
                  <div>Redeem: {deal.redemptionMethod}</div>
                  <div>Expires: {safeFormatDate(deal.expiryDate) || 'No expiry'}</div>
                  {deal.additionalInfo && (
                    <div className="text-gray-400">Note: {deal.additionalInfo}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


    </div>
  );
}