'use server';

/**
 * @fileOverview Provides AI-powered suggestions for troubleshooting RPC endpoints based on benchmark results.
 *
 * - troubleshootRpcEndpoint - A function that takes benchmark results and returns troubleshooting suggestions.
 * - TroubleshootRpcEndpointInput - The input type for the troubleshootRpcEndpoint function.
 * - TroubleshootRpcEndpointOutput - The return type for the troubleshootRpcEndpoint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TroubleshootRpcEndpointInputSchema = z.object({
  chain: z.string().describe('The name of the blockchain network.'),
  rpcUrl: z.string().describe('The RPC URL being benchmarked.'),
  cups: z.number().describe('The Chain Usage Per Second (CUPS) metric.'),
  effectiveRps: z.number().describe('The effective sequential Requests Per Second (RPS) metric.'),
  burstRps: z.number().describe('The burst RPS metric.'),
});
export type TroubleshootRpcEndpointInput = z.infer<typeof TroubleshootRpcEndpointInputSchema>;

const TroubleshootRpcEndpointOutputSchema = z.object({
  suggestions: z.string().describe('AI-powered suggestions for troubleshooting the RPC endpoint.'),
});
export type TroubleshootRpcEndpointOutput = z.infer<typeof TroubleshootRpcEndpointOutputSchema>;

export async function troubleshootRpcEndpoint(input: TroubleshootRpcEndpointInput): Promise<TroubleshootRpcEndpointOutput> {
  return troubleshootRpcEndpointFlow(input);
}

const prompt = ai.definePrompt({
  name: 'troubleshootRpcEndpointPrompt',
  input: {schema: TroubleshootRpcEndpointInputSchema},
  output: {schema: TroubleshootRpcEndpointOutputSchema},
  prompt: `You are an AI assistant that provides troubleshooting suggestions for blockchain RPC endpoints based on benchmark results.

  Given the following benchmark results for the {{chain}} network and RPC URL {{rpcUrl}}:

  - Chain Usage Per Second (CUPS): {{cups}}
  - Effective Requests Per Second (RPS): {{effectiveRps}}
  - Burst RPS: {{burstRps}}

  Provide specific, actionable suggestions to troubleshoot the RPC endpoint. Consider potential issues such as network connectivity, server overload, rate limiting, or incorrect RPC URL configuration. Also, consider what reasonable values for the chain would be, and list the source of truth for this expectation.
  Your suggestions should be clear, concise, and easy to understand for a user with limited technical knowledge.
  `,
});

const troubleshootRpcEndpointFlow = ai.defineFlow(
  {
    name: 'troubleshootRpcEndpointFlow',
    inputSchema: TroubleshootRpcEndpointInputSchema,
    outputSchema: TroubleshootRpcEndpointOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
