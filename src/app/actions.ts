
'use server';

import {
    detectChain as detectChainRpc,
    CHAIN_NAMES,
    CHAIN_CHECK_FUNCTIONS,
    measureCups,
    measureEffectiveRps,
    measureBurstRps
} from '@/lib/rpc';
import { sendFailureReport } from './failureReportActions';

export async function detectChain(formData: FormData) {
    const rpcUrl = formData.get('rpcUrl') as string;
    if (!rpcUrl) {
        return { error: 'RPC URL is required.' };
    }
    try {
        const chainId = await detectChainRpc(rpcUrl);
        const chainName = CHAIN_NAMES[chainId] || "Unknown";
        return { chainId, chainName };
    } catch (e: any) {
        await sendFailureReport({
            rpcUrl,
            errorContext: 'Chain Detection',
            errorMessage: e.message,
        });
        return { error: e.message };
    }
}

// Helper for benchmark actions
async function setupBenchmark(formData: FormData) {
    const rpcUrl = formData.get('rpcUrl') as string;
    const chainId = formData.get('chainId') as string;

    if (!rpcUrl) {
        return { error: 'RPC URL is required.' };
    }
    if (!chainId) {
        return { error: 'Chain ID is required.' };
    }
    const checkFunc = CHAIN_CHECK_FUNCTIONS[chainId];
    if (!checkFunc) {
        return { error: `Unsupported chain: ${chainId}` };
    }
    return { rpcUrl, checkFunc };
}

export async function getLatestBlock(formData: FormData) {
    const setup = await setupBenchmark(formData);
    if ('error' in setup) return setup;
    const { rpcUrl, checkFunc } = setup;

    try {
        const latestBlock = await checkFunc(rpcUrl);
        return { latestBlock };
    } catch (e: any) {
        await sendFailureReport({
            rpcUrl,
            errorContext: 'Get Latest Block',
            errorMessage: e.message,
        });
        return { error: e.message || 'The RPC endpoint is unreachable or invalid.' };
    }
}

export async function getCUPS(formData: FormData) {
    const setup = await setupBenchmark(formData);
    if ('error' in setup) return setup;
    const { rpcUrl, checkFunc } = setup;

    try {
        const cupsValue = await measureCups(checkFunc, rpcUrl);
        const cups = cupsValue !== null ? cupsValue.toFixed(2) : '-';
        return { cups };
    } catch (e: any) {
        await sendFailureReport({
            rpcUrl,
            errorContext: 'Get CUPS',
            errorMessage: e.message,
        });
        return { error: e.message || 'Failed to measure CUPS.' };
    }
}

export async function getEffectiveRps(formData: FormData) {
    const setup = await setupBenchmark(formData);
    if ('error' in setup) return setup;
    const { rpcUrl, checkFunc } = setup;

    try {
        const rpsValue = await measureEffectiveRps(checkFunc, rpcUrl);
        const effectiveRps = rpsValue !== null ? Math.round(rpsValue) : '-';
        return { effectiveRps };
    } catch (e: any) {
        await sendFailureReport({
            rpcUrl,
            errorContext: 'Get Effective RPS',
            errorMessage: e.message,
        });
        return { error: e.message || 'Failed to measure Effective RPS.' };
    }
}

export async function getBurstRps(formData: FormData) {
    const setup = await setupBenchmark(formData);
    if ('error' in setup) return setup;
    const { rpcUrl, checkFunc } = setup;

    try {
        const rpsValue = await measureBurstRps(checkFunc, rpcUrl);
        const burstRps = rpsValue !== null ? Math.round(rpsValue) : '-';
        return { burstRps };
    } catch (e: any) {
        await sendFailureReport({
            rpcUrl,
            errorContext: 'Get Burst RPS',
            errorMessage: e.message,
        });
        return { error: e.message || 'Failed to measure Burst RPS.' };
    }
}
