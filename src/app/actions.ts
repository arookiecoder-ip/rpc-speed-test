'use server';

import {
    detectChain as detectChainLogic,
    CHAIN_NAMES,
    CHAIN_CHECK_FUNCTIONS,
    measureCups,
    measureEffectiveRps,
    measureBurstRps
} from '@/lib/rpc';

export async function detectChain(formData: FormData) {
    const rpcUrl = formData.get('rpcUrl') as string;
    if (!rpcUrl) {
        return { error: 'RPC URL is required.' };
    }
    try {
        const chainId = detectChainLogic(rpcUrl);
        const chainName = CHAIN_NAMES[chainId] || "Unknown";
        return { chainId, chainName };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function runBenchmark(formData: FormData) {
    const rpcUrl = formData.get('rpcUrl') as string;
    const chainId = formData.get('chainId') as string;

    if (!rpcUrl || !chainId) {
        return { error: 'RPC URL and chain ID are required.' };
    }

    const checkFunc = CHAIN_CHECK_FUNCTIONS[chainId];
    if (!checkFunc) {
        return { error: `Unsupported chain: ${chainId}` };
    }

    try {
        // Run checks in parallel
        const results = await Promise.allSettled([
            checkFunc(rpcUrl),
            measureCups(checkFunc, rpcUrl),
            measureEffectiveRps(checkFunc, rpcUrl),
            measureBurstRps(checkFunc, rpcUrl),
        ]);

        const [latestBlockRes, cupsRes, effectiveRpsRes, burstRpsRes] = results;

        const latestBlock = latestBlockRes.status === 'fulfilled' ? latestBlockRes.value : '-';
        const cups = cupsRes.status === 'fulfilled' && cupsRes.value !== null ? cupsRes.value.toFixed(2) : '-';
        const effectiveRps = effectiveRpsRes.status === 'fulfilled' && effectiveRpsRes.value !== null ? Math.round(effectiveRpsRes.value) : '-';
        const burstRps = burstRpsRes.status === 'fulfilled' && burstRpsRes.value !== null ? Math.round(burstRpsRes.value) : '-';
        
        if (latestBlockRes.status === 'rejected') {
            console.error("Benchmark Error:", latestBlockRes.reason);
            const errorMessage = latestBlockRes.reason instanceof Error ? latestBlockRes.reason.message : 'The RPC endpoint is unreachable or invalid.';
            return { error: errorMessage };
        }
        
        return {
            latestBlock,
            cups,
            effectiveRps,
            burstRps,
        };

    } catch (e: any) {
        console.error("Benchmark Error:", e);
        return { error: e.message || 'An unknown error occurred during benchmark.' };
    }
}
