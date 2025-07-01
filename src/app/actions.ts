'use server';

import { troubleshootRpcEndpoint, type TroubleshootRpcEndpointInput } from '@/ai/flows/troubleshoot-rpc-endpoint';

export async function getTroubleshootingSuggestions(input: TroubleshootRpcEndpointInput) {
  try {
    const result = await troubleshootRpcEndpoint(input);
    return { suggestions: result.suggestions, error: null };
  } catch (e) {
    console.error("AI Troubleshooting Error:", e);
    // In a real app, you might want to log this error to a monitoring service
    return { suggestions: null, error: 'An unexpected error occurred while contacting the AI. Please try again later.' };
  }
}
