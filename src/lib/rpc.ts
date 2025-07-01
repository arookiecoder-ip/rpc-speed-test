
const CHAIN_KEYWORDS: Record<string, string[]> = {
    evm: ["eth", "ethereum", "bsc", "polygon", "matic", "avalanche", "avax", "arbitrum", "optimism", "fantom", "base"],
    aptos: ["apt", "aptos"],
    sui: ["sui"],
    solana: ["sol", "solana"],
    cosmos: ["cosmos", "atom", "gaia", "osmosis", "osmo", "juno", "terra", "luna", "secret", "scrt"],
    dydx: ["dydx"],
    substrate: ["polkadot", "kusama", "moonbeam", "substrate"],
    beacon: ["beacon", "consensus"],
};

export const CHAIN_NAMES: Record<string, string> = {
    evm: "EVM",
    aptos: "Aptos",
    sui: "Sui",
    solana: "Solana",
    cosmos: "Cosmos",
    dydx: "dYdX",
    substrate: "Substrate",
    beacon: "Beacon",
    unknown: "Unknown",
};

export function detectChain(rpcUrl: string): string {
    const lowered = rpcUrl.toLowerCase();
    
    if (lowered.includes("beacon")) return 'beacon';
    if (lowered.includes("dydx")) return 'dydx';
    
    for (const chain in CHAIN_KEYWORDS) {
        if (CHAIN_KEYWORDS[chain].some(word => lowered.includes(word))) {
            return chain;
        }
    }
    return 'unknown';
}

// --- Chain Specific Checkers ---

async function checkEvm(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`EVM check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`EVM check failed: ${data.error.message}`);
    return parseInt(data.result, 16);
}

async function checkSolana(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "getSlot", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Solana check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Solana check failed: ${data.error.message}`);
    return data.result;
}

async function checkSui(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "sui_getLatestCheckpointSequenceNumber", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Sui check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Sui check failed: ${data.error.message}`);
    return parseInt(data.result);
}

async function checkAptos(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/v1`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Aptos check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    return parseInt(data.ledger_version);
}

async function checkCosmos(rpc: string): Promise<number> {
    const baseUrl = rpc.replace(/\/$/, '');
    const endpoints = [
        `${baseUrl}/blocks/latest`,
        `${baseUrl}/cosmos/base/tendermint/v1beta1/blocks/latest`,
        `${baseUrl}/status`
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (res.ok) {
                const data = await res.json();
                if (url.endsWith('/blocks/latest')) {
                    // Handle different structures
                    const height = data.block?.header?.height || data.header?.height;
                    if(height) return parseInt(height);
                } else if (url.endsWith('/status')) {
                    const height = data.result?.sync_info?.latest_block_height;
                    if(height) return parseInt(height);
                }
            }
        } catch (e) { /* continue to next endpoint */ }
    }
    throw new Error('All Cosmos endpoints failed. The RPC might be incorrect or offline.');
}

async function checkSubstrate(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "chain_getHeader", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Substrate check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Substrate check failed: ${data.error.message}`);
    return parseInt(data.result.number, 16);
}

async function checkBeacon(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/eth/v1/beacon/states/head/finality_checkpoints`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Beacon check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    return parseInt(data.data.finalized.epoch);
}

export const CHAIN_CHECK_FUNCTIONS: Record<string, (rpc: string) => Promise<number>> = {
    evm: checkEvm,
    solana: checkSolana,
    cosmos: checkCosmos,
    aptos: checkAptos,
    sui: checkSui,
    dydx: checkCosmos,
    substrate: checkSubstrate,
    beacon: checkBeacon,
};

// --- Measurement Functions ---

export async function measureCups(checkFunc: (rpc: string) => Promise<number>, rpc: string): Promise<number | null> {
    try {
        const val1 = await checkFunc(rpc);
        await new Promise(resolve => setTimeout(resolve, 10000));
        const val2 = await checkFunc(rpc);
        return (val2 - val1) / 10;
    } catch (e) {
        console.error("CUPS measurement failed:", e);
        return null;
    }
}

export async function measureEffectiveRps(checkFunc: (rpc: string) => Promise<number>, rpc: string): Promise<number | null> {
    try {
        const numRequests = 5;
        let successCount = 0;
        const start = performance.now();
        for (let i = 0; i < numRequests; i++) {
            try {
                await checkFunc(rpc);
                successCount++;
            } catch (e) { /* ignore single request failure */ }
        }
        const duration = (performance.now() - start) / 1000;
        if (duration === 0) return successCount;
        return successCount / duration;
    } catch (e) {
        console.error("Effective RPS measurement failed:", e);
        return null;
    }
}

export async function measureBurstRps(checkFunc: (rpc: string) => Promise<number>, rpc: string): Promise<number | null> {
    try {
        const batchSize = 20;
        const start = performance.now();
        const burstPromises = Array(batchSize).fill(null).map(() => checkFunc(rpc));
        
        const results = await Promise.allSettled(burstPromises);
        const duration = (performance.now() - start) / 1000;

        const successful = results.filter(p => p.status === 'fulfilled').length;
        
        if (duration > 1) { // If it took more than a second, normalize to RPS
            return successful / duration;
        }

        return successful; // Otherwise, return raw success count for that second
    } catch (e) {
        console.error("Burst RPS measurement failed:", e);
        return null;
    }
}
