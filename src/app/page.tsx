
"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  RefreshCw,
  ArrowRightLeft,
  Zap,
  Loader2,
  SlidersHorizontal,
  ServerCrash,
  Square,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { 
    detectChain as detectChainAction, 
    getLatestBlock,
    getCUPS,
    getEffectiveRps,
    getBurstRps
} from '@/app/actions';
import { CHAIN_NAMES } from '@/lib/rpc';
import { ChainIcon } from '@/components/chain-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChainSelector } from '@/components/chain-selector';
import { 
    Sheet, 
    SheetContent, 
    SheetDescription, 
    SheetHeader, 
    SheetTitle, 
    SheetTrigger 
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const MetricCard = ({ icon: Icon, title, value, unit, isBenchmarking }: { icon: React.ElementType, title: string, value: string | number, unit: string, isBenchmarking: boolean }) => (
  <Card className="bg-card/80 border-border/60 text-left">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
        {(isBenchmarking && value === '-') ? (
            <div className="h-8 flex items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        ) : (
            <div className="text-2xl font-bold h-8 flex items-center">{value}</div>
        )}
      <p className="text-xs text-muted-foreground">{unit}</p>
    </CardContent>
  </Card>
);

const DetectedChain = ({ chainId, chainName }: { chainId: string | null, chainName: string | null }) => {
    if (!chainId || !chainName) return null;

    if (chainId === 'unknown') {
        return (
            <div className="flex items-center gap-2 text-sm text-destructive">
                <ServerCrash className="w-5 h-5" />
                <span>Unknown / Invalid RPC</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ChainIcon chain={chainId} className="w-5 h-5" />
            <span>{chainName}</span>
        </div>
    );
};


export default function Home() {
  const [rpcUrl, setRpcUrl] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('auto');
  const [detectedChainId, setDetectedChainId] = useState<string | null>(null);
  const [detectedChainName, setDetectedChainName] = useState<string | null>(null);

  const { toast } = useToast();
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const [latestBlock, setLatestBlock] = useState<string | number>('-');
  const [cups, setCups] = useState<string | number>('-');
  const [effectiveRps, setEffectiveRps] = useState<string | number>('-');
  const [burstRps, setBurstRps] = useState<string | number>('-');
  
  const [isPollingBlock, setIsPollingBlock] = useState(false);
  const blockUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  const [benchmarkParams, setBenchmarkParams] = useState({
    latestBlock: true,
    cups: true,
    effectiveRps: true,
    burstRps: true,
  });

  const handleParamChange = (param: keyof typeof benchmarkParams, checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setBenchmarkParams(prev => ({ ...prev, [param]: checked }));
    }
  };

  const stopPolling = () => {
    if (blockUpdateInterval.current) {
      clearInterval(blockUpdateInterval.current);
      blockUpdateInterval.current = null;
    }
    setIsPollingBlock(false);
  };

  const resetMetrics = () => {
      stopPolling();
      setLatestBlock('-');
      setCups('-');
      setEffectiveRps('-');
      setBurstRps('-');
      setDetectedChainId(null);
      setDetectedChainName(null);
  };

  const handleStopBenchmark = () => {
    isCancelledRef.current = true;
    setIsBenchmarking(false);
    stopPolling();
    toast({
      title: 'Benchmark Cancelled',
      description: 'The process was stopped by the user.',
    });
  };

  const handleStartBenchmark = async () => {
      if (!rpcUrl) {
          toast({ title: "Error", description: "Please enter an RPC URL.", variant: "destructive" });
          return;
      }
      
      resetMetrics();
      isCancelledRef.current = false;
      setIsBenchmarking(true); 

      let finalChainId = selectedChainId;

      if (finalChainId === 'auto') {
          const detectFormData = new FormData();
          detectFormData.append('rpcUrl', rpcUrl);
          const detectResult = await detectChainAction(detectFormData);

          if (detectResult?.error || !detectResult?.chainId || detectResult.chainId === 'unknown') {
              toast({ title: "Detection Failed", description: detectResult?.error || "Could not determine chain type.", variant: "destructive" });
              setDetectedChainId('unknown');
              setDetectedChainName('Unknown');
              setIsBenchmarking(false);
              return;
          }
          finalChainId = detectResult.chainId;
          setDetectedChainId(detectResult.chainId);
          setDetectedChainName(detectResult.chainName);
          toast({ title: "Success", description: `Auto-detected ${detectResult.chainName} chain.` });
      } else {
        setDetectedChainId(selectedChainId);
        setDetectedChainName(CHAIN_NAMES[selectedChainId] || "Unknown");
      }

      const formData = new FormData();
      formData.append('rpcUrl', rpcUrl);
      formData.append('chainId', finalChainId);

      const initialBlockResult = await getLatestBlock(formData);
      if (isCancelledRef.current) { setIsBenchmarking(false); return; }

      if (initialBlockResult?.error) {
          setLatestBlock('Error');
          toast({ title: "Connection Failed", description: initialBlockResult.error, variant: "destructive" });
          setIsBenchmarking(false);
          return;
      }
      setLatestBlock(initialBlockResult.latestBlock?.toLocaleString() ?? '-');
      
      if (benchmarkParams.latestBlock) {
        setIsPollingBlock(true);
      }

      if (benchmarkParams.cups) {
        const cupsResult = await getCUPS(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (cupsResult?.error) setCups('Error');
        else if (cupsResult) setCups(cupsResult.cups ?? '-');
      }
      
      if (benchmarkParams.effectiveRps) {
        const effectiveRpsResult = await getEffectiveRps(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (effectiveRpsResult?.error) setEffectiveRps('Error');
        else if (effectiveRpsResult) setEffectiveRps(effectiveRpsResult.effectiveRps ?? '-');
      }

      if (benchmarkParams.burstRps) {
        const burstRpsResult = await getBurstRps(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (burstRpsResult?.error) setBurstRps('Error');
        else if (burstRpsResult) setBurstRps(burstRpsResult.burstRps ?? '-');
      }

      setIsBenchmarking(false);
      
      if (!benchmarkParams.latestBlock) {
        stopPolling();
      }

      if (!isCancelledRef.current) {
          toast({ title: "Benchmark Complete", description: "Selected metrics gathered." });
      }
  };

  useEffect(() => {
    if (!isPollingBlock || !detectedChainId) {
      return;
    }

    const fetchAndUpdateBlock = async () => {
      if (!rpcUrl || !detectedChainId) return;

      const formData = new FormData();
      formData.append('rpcUrl', rpcUrl);
      formData.append('chainId', detectedChainId);
      const result = await getLatestBlock(formData);

      if (result?.error) {
        setLatestBlock('Error');
        toast({ title: "Connection Lost", description: "Stopping real-time block updates.", variant: "destructive" });
        stopPolling();
      } else if (result) {
        setLatestBlock(result.latestBlock?.toLocaleString() ?? '-');
      }
    };

    blockUpdateInterval.current = setInterval(fetchAndUpdateBlock, 1000);

    return () => {
      if (blockUpdateInterval.current) {
        clearInterval(blockUpdateInterval.current);
      }
    };
  }, [isPollingBlock, rpcUrl, detectedChainId]);

  const isProcessing = isBenchmarking;
  const noParamsSelected = Object.values(benchmarkParams).every(v => !v);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-end">
        <ThemeToggle />
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center text-center gap-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-bold font-headline" style={{ color: 'hsl(var(--primary))' }}>
            Blockspeed
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Benchmark your blockchain RPC endpoint for speed and reliability.
          </p>
        </div>

        <Card className="w-full max-w-3xl p-6 sm:p-8 bg-transparent border-border/60">
          <CardHeader className="text-center p-0 mb-6">
            <CardTitle className="font-headline text-2xl">Configuration</CardTitle>
            <CardDescription>Enter your RPC URL and select a chain to begin.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  type="text"
                  placeholder="https://your-rpc-endpoint.com"
                  className="bg-input border-border/80 flex-grow text-base h-12"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value)}
                  disabled={isProcessing}
                  suppressHydrationWarning
                />
                <ChainSelector 
                  value={selectedChainId}
                  onChange={setSelectedChainId}
                  disabled={isProcessing}
                />
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground h-8">
                  {(isBenchmarking && detectedChainId) ? (
                    <DetectedChain chainId={detectedChainId} chainName={detectedChainName} />
                  ) : (isBenchmarking) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : null}
                </div>
               <Button 
                onClick={isBenchmarking ? handleStopBenchmark : handleStartBenchmark}
                disabled={!rpcUrl || isProcessing || noParamsSelected}
                className="w-full h-12 text-base"
                variant={isBenchmarking ? "destructive" : "default"}
                >
                {isBenchmarking ? (
                    <>
                        <Square className="mr-2 h-4 w-4" />
                        Stop Benchmark
                    </>
                ) : (
                    <>
                        <Zap className="mr-2 h-4 w-4" />
                        Start Benchmark
                    </>
                )}
               </Button>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Box} title="Latest Block" value={latestBlock} unit="number" isBenchmarking={isBenchmarking && benchmarkParams.latestBlock} />
          <MetricCard icon={RefreshCw} title="Chain Usage Per Second (CUPS)" value={cups} unit="units/sec" isBenchmarking={isBenchmarking && benchmarkParams.cups}/>
          <MetricCard icon={ArrowRightLeft} title="Effective RPS (Sequential)" value={effectiveRps} unit="req/sec" isBenchmarking={isBenchmarking && benchmarkParams.effectiveRps} />
          <MetricCard icon={Zap} title="Burst RPS (Parallel)" value={burstRps} unit="req/sec" isBenchmarking={isBenchmarking && benchmarkParams.burstRps} />
        </div>

      </main>
       <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground bg-card/80 border-border/60 border rounded-full">
                  <SlidersHorizontal className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Benchmark Settings</SheetTitle>
                    <SheetDescription>
                        Select which parameters to run during the benchmark.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox id="latestBlock" checked={benchmarkParams.latestBlock} onCheckedChange={(checked) => handleParamChange('latestBlock', checked)} />
                        <Label htmlFor="latestBlock" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">Live Block Number</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Checkbox id="cups" checked={benchmarkParams.cups} onCheckedChange={(checked) => handleParamChange('cups', checked)} />
                        <Label htmlFor="cups" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">Chain Usage Per Second (CUPS)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Checkbox id="effectiveRps" checked={benchmarkParams.effectiveRps} onCheckedChange={(checked) => handleParamChange('effectiveRps', checked)} />
                        <Label htmlFor="effectiveRps" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">Effective RPS (Sequential)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Checkbox id="burstRps" checked={benchmarkParams.burstRps} onCheckedChange={(checked) => handleParamChange('burstRps', checked)} />
                        <Label htmlFor="burstRps" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">Burst RPS (Parallel)</Label>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
      </div>
      <footer className="py-6 text-center text-muted-foreground text-sm">
        Created by <a href="https://github.com/arookiecoder-ip" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">arookiecoder</a>
      </footer>
    </div>
  );
}
