


const CHAIN_KEYWORDS: Record<string, string[]> = {
    evm: [
        "eth", "ethereum", "bsc", "binance", "bnb", "polygon", "matic", "avalanche", "avax", 
        "arbitrum", "optimism", "fantom", "base", "gnosis", "xdai", "celo", 
        "moonbeam", "moonriver", "cronos", "boba", "metis", "aurora", "zksync", 
        "scroll", "linea", "mantle", "blast", "mode", "sonic", "harmony", "fuse",
        "filecoin", "kava", "ronin", "core", "conflux", "oasis", "palm", "telos",
        "evmos", "meter", "tomochain", "klaytn", "bittorrent", "dogechain", "thundercore",
        "callisto", "rei", "gochain", "horizen", "eon", "chiliz", "shiden", "shibuya",
        "astar", "platon", "bittensor", "x1", "holesky", "fraxtal", "zora",
        "taiko", "canto", "berachain", "degen", "morph", "lightlink", "cyber", "mitosis",
        "zklink", "aevo", "shardeum", "neon", "rootstock", "rsk", "bitlayer", "merlin",
        "bouncebit", "bitgert", "velas", "velocore", "coredao", "aleph", "unichain"
    ],
    cosmos: [
        "cosmos", "atom", "gaia", "osmosis", "osmo", "juno", "terra", "luna", 
        "secret", "scrt", "mantra", "kava", "akash", "axelar", "stargaze", "agoric",
        "stride", "sei", "neutron", "celestia", "nomic", "archway", "persistence",
        "sommelier", "kujira", "evmos", "canto", "comdex", "chihuahua", "crescent",
        "desmos", "irisnet", "regen", "sentinel", "sifchain", "umee", "onomy", "kichain",
        "bitsong", "assetmantle", "decentr", "likecoin", "cybermiles", "certik", "iov",
        "fetch.ai", "andromeda", "quicksilver", "provenance", "dymension", "lava", "analog",
        "xpla", "oraichain"
    ],
    aptos: ["apt", "aptos"],
    sui: ["sui"],
    solana: ["sol", "solana"],
    injective: ["inj", "injective"],
    dydx: ["dydx"],
    substrate: ["polkadot", "dot", "kusama", "ksm", "substrate", "aleph zero", "manta"],
    beacon: ["beacon", "consensus"],
    starknet: ["starknet", "stark"],
    stacks: ["stacks", "stx"],
    utxo: ["bitcoin", "btc", "litecoin", "ltc", "dogecoin", "doge", "dash"],
    kaspa: ["kaspa", "ksp"],
    ironfish: ["ironfish", "iron"],
    near: ["near"],
    tron: ["tron", "trx"],
};

export const CHAIN_NAMES: Record<string, string> = {
    evm: "EVM",
    aptos: "Aptos",
    sui: "Sui",
    solana: "Solana",
    injective: "Injective",
    cosmos: "Cosmos",
    dydx: "dYdX",
    substrate: "Substrate",
    beacon: "Beacon",
    starknet: "StarkNet",
    stacks: "Stacks",
    utxo: "Bitcoin-like (UTXO)",
    kaspa: "Kaspa",
    ironfish: "Iron Fish",
    near: "Near",
    tron: "TRON",
    unknown: "Unknown",
};

export async function detectChain(rpcUrl: string): Promise<string> {
    const lowered = rpcUrl.toLowerCase();
    
    // 1. Keyword matching for speed and for specific chains
    // Prioritize specific chains that might also match general keywords
    if (lowered.includes("tron") || lowered.includes("trx")) return 'tron';
    if (lowered.includes("injective") || lowered.includes("inj")) return 'injective';
    if (lowered.includes("beacon")) return 'beacon';
    if (lowered.includes("dydx")) return 'dydx';
    if (lowered.includes("starknet") || lowered.includes("stark")) return 'starknet';
    
    for (const chain in CHAIN_KEYWORDS) {
        if (CHAIN_KEYWORDS[chain].some(word => lowered.includes(word))) {
            return chain;
        }
    }

    // 2. If no keyword match, start probing endpoints. This will catch generic EVM urls.
    const probeOrder = [
        { chainId: 'evm', checkFunc: checkEvm },
        { chainId: 'tron', checkFunc: checkTron },
        { chainId: 'solana', checkFunc: checkSolana },
        { chainId: 'cosmos', checkFunc: checkCosmos },
        { chainId: 'sui', checkFunc: checkSui },
        { chainId: 'aptos', checkFunc: checkAptos },
        { chainId: 'substrate', checkFunc: checkSubstrate },
        { chainId: 'starknet', checkFunc: checkStarknet },
        { chainId: 'utxo', checkFunc: checkUtxo },
        { chainId: 'near', checkFunc: checkNear },
        { chainId: 'stacks', checkFunc: checkStacks },
        { chainId: 'kaspa', checkFunc: checkKaspa },
        { chainId: 'ironfish', checkFunc: checkIronfish },
        { chainId: 'beacon', checkFunc: checkBeacon },
    ];

    for (const probe of probeOrder) {
        try {
            await probe.checkFunc(rpcUrl);
            // If the check function doesn't throw, we've found our chain type
            return probe.chainId;
        } catch (e) {
            // This probe failed, continue to the next one
        }
    }

    return 'unknown';
}

// --- Chain Specific Checkers ---

async function checkEvm(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`EVM check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`EVM check failed: ${data.error.message}`);
    return parseInt(data.result, 16);
}

async function checkTron(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/wallet/getnowblock`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) 
    });
    if (!res.ok) throw new Error(`TRON check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (!data.block_header?.raw_data?.number) {
        throw new Error('Invalid response from TRON RPC');
    }
    return data.block_header.raw_data.number;
}

async function checkSolana(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "getSlot", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Solana check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Solana check failed: ${data.error.message}`);
    return data.result;
}

async function checkSui(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "sui_getLatestCheckpointSequenceNumber", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Sui check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Sui check failed: ${data.error.message}`);
    return parseInt(data.result);
}

async function checkAptos(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/v1`, { signal: AbortSignal.timeout(5000) });
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
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Substrate check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Substrate check failed: ${data.error.message}`);
    return parseInt(data.result.number, 16);
}

async function checkBeacon(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/eth/v1/beacon/states/head/finality_checkpoints`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Beacon check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    return parseInt(data.data.finalized.epoch);
}

async function checkStarknet(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "starknet_blockNumber", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Starknet check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Starknet check failed: ${data.error.message}`);
    if (typeof data.result !== 'number') throw new Error('Invalid response from Starknet RPC');
    return data.result;
}

async function checkStacks(rpc: string): Promise<number> {
    const res = await fetch(`${rpc.replace(/\/$/, '')}/v2/info`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Stacks check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (typeof data.stacks_tip_height !== 'number') throw new Error('Invalid response from Stacks RPC');
    return data.stacks_tip_height;
}

async function checkUtxo(rpc: string): Promise<number> {
    const payload = { jsonrpc: "1.0", method: "getblockcount", params: [], id: "chaindoctor" };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`UTXO check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`UTXO check failed: ${data.error.message}`);
    if (typeof data.result !== 'number') throw new Error('Invalid response from UTXO RPC');
    return data.result;
}

async function checkKaspa(rpc: string): Promise<number> {
    const payload = { method: "getBlockDagInfoRequest", params: {}, id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Kaspa check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data?.getBlockDagInfoResponse?.error) throw new Error(`Kaspa check failed: ${data.getBlockDagInfoResponse.error.message}`);
    const blockCount = data?.getBlockDagInfoResponse?.blockCount;
    if (!blockCount) throw new Error('Invalid response from Kaspa RPC');
    return parseInt(blockCount, 10);
}

async function checkIronfish(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "chain_head", params: [], id: 1 };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Iron Fish check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Iron Fish check failed: ${data.error.message}`);
    const sequence = data?.result?.sequence;
    if (typeof sequence !== 'number') throw new Error('Invalid response from Iron Fish RPC');
    return sequence;
}

async function checkNear(rpc: string): Promise<number> {
    const payload = { jsonrpc: "2.0", method: "block", params: { finality: "final" }, id: "dontcare" };
    const res = await fetch(rpc, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Near check failed: Server responded with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Near check failed: ${data.error.message}`);
    const height = data?.result?.header?.height;
    if (typeof height !== 'number') throw new Error('Invalid response from Near RPC');
    return height;
}

export const CHAIN_CHECK_FUNCTIONS: Record<string, (rpc: string) => Promise<number>> = {
    evm: checkEvm,
    solana: checkSolana,
    injective: checkCosmos,
    cosmos: checkCosmos,
    aptos: checkAptos,
    sui: checkSui,
    dydx: checkCosmos,
    substrate: checkSubstrate,
    beacon: checkBeacon,
    starknet: checkStarknet,
    stacks: checkStacks,
    utxo: checkUtxo,
    kaspa: checkKaspa,
    ironfish: checkIronfish,
    near: checkNear,
    tron: checkTron,
};

// --- Measurement Functions ---

export async function measureCups(checkFunc: (rpc: string) => Promise<number>, rpc: string): Promise<number | null> {
    try {
        const val1 = await checkFunc(rpc);
        await new Promise(resolve => setTimeout(resolve, 5000));
        const val2 = await checkFunc(rpc);
        return (val2 - val1) / 5;
    } catch (e) {
        console.error("CUPS measurement failed:", e);
        return null;
    }
}

export async function measureEffectiveRps(checkFunc: (rpc: string) => Promise<number>, rpc: string): Promise<number | null> {
    try {
        const numRequests = 20;
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
