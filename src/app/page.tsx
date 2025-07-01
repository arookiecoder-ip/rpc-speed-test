"use client";

import React, { useState, useTransition, useRef, useEffect } from 'react';
import {
  Box,
  RefreshCw,
  ArrowRightLeft,
  Zap,
  Loader2,
  Settings2,
  Moon,
  SlidersHorizontal,
  ServerCrash,
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
    detectChain, 
    getLatestBlock,
    getCUPS,
    getEffectiveRps,
    getBurstRps
} from '@/app/actions';
import { ChainIcon } from '@/components/chain-icon';

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
  const [detectedChainId, setDetectedChainId] = useState<string | null>(null);
  const [detectedChainName, setDetectedChainName] = useState<string | null>(null);

  const { toast } = useToast();
  const [isDetecting, startDetectTransition] = useTransition();
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const [latestBlock, setLatestBlock] = useState<string | number>('-');
  const [cups, setCups] = useState<string | number>('-');
  const [effectiveRps, setEffectiveRps] = useState<string | number>('-');
  const [burstRps, setBurstRps] = useState<string | number>('-');
  
  const [isPollingBlock, setIsPollingBlock] = useState(false);
  const blockUpdateInterval = useRef<NodeJS.Timeout | null>(null);

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
  };

  const handleDetectChain = async () => {
      if (!rpcUrl) {
          toast({ title: "Error", description: "Please enter an RPC URL.", variant: "destructive" });
          return;
      }
      resetMetrics();
      setDetectedChainId(null);
      setDetectedChainName(null);

      startDetectTransition(async () => {
          const formData = new FormData();
          formData.append('rpcUrl', rpcUrl);
          const result = await detectChain(formData);

          if (result?.error) {
              toast({ title: "Detection Failed", description: result.error, variant: "destructive" });
              setDetectedChainId('unknown');
              setDetectedChainName('Unknown');
          } else if (result?.chainId) {
              setDetectedChainId(result.chainId);
              setDetectedChainName(result.chainName);
              toast({ title: "Success", description: `Detected ${result.chainName} chain.`});
          }
      });
  };

  const handleStartBenchmark = async () => {
      if (!rpcUrl) {
          toast({ title: "Error", description: "Please enter an RPC URL.", variant: "destructive" });
          return;
      }
      if (!detectedChainId || detectedChainId === 'unknown') {
          toast({ title: "Error", description: "Please detect a valid chain first.", variant: "destructive" });
          return;
      }
      
      resetMetrics();
      setIsBenchmarking(true); // This will show loaders on cards that are reset

      const formData = new FormData();
      formData.append('rpcUrl', rpcUrl);
      formData.append('chainId', detectedChainId);

      // --- Block Number Logic ---
      // Fetch initial block and start polling immediately on success.
      // This is not awaited, so other benchmarks can start.
      getLatestBlock(formData).then(result => {
        if (result?.error) {
            setLatestBlock('Error');
            toast({ title: "Connection Failed", description: result.error, variant: "destructive" });
        } else if (result) {
            setLatestBlock(result.latestBlock?.toLocaleString() ?? '-');
            setIsPollingBlock(true); // Start real-time updates!
        }
      });
      
      // --- Other Benchmark Logic ---
      // These run in parallel and update their own state.
      const cupsPromise = getCUPS(formData).then(result => {
        if (result?.error) {
            setCups('Error');
        } else if (result) {
            setCups(result.cups ?? '-');
        }
      });

      const effectiveRpsPromise = getEffectiveRps(formData).then(result => {
        if (result?.error) {
            setEffectiveRps('Error');
        } else if (result) {
            setEffectiveRps(result.effectiveRps ?? '-');
        }
      });

      const burstRpsPromise = getBurstRps(formData).then(result => {
        if (result?.error) {
            setBurstRps('Error');
        } else if (result) {
            setBurstRps(result.burstRps ?? '-');
        }
      });

      // --- Finalization Logic ---
      // Wait for the long-running benchmarks to complete, then turn off spinners and show toast.
      await Promise.allSettled([cupsPromise, effectiveRpsPromise, burstRpsPromise]);
      
      setIsBenchmarking(false);
      toast({ title: "Benchmark Complete", description: "All available metrics gathered." });
  };

  useEffect(() => {
    if (!isPollingBlock) {
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

  const isProcessing = isDetecting || isBenchmarking;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-end">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Moon className="h-5 w-5" />
          <span className="sr-only">Toggle Theme</span>
        </Button>
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
            <CardDescription>Enter your RPC URL to begin.</CardDescription>
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
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button onClick={handleDetectChain} disabled={!rpcUrl || isProcessing} className="w-full sm:w-auto h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90">
                    {isDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
                    Detect Chain
                  </Button>
                </div>
              </div>
              {(isDetecting || detectedChainId) && (
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground h-8">
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <DetectedChain chainId={detectedChainId} chainName={detectedChainName} />
                  )}
                </div>
              )}
               <Button onClick={handleStartBenchmark} disabled={isProcessing || !detectedChainId || detectedChainId === 'unknown'} className="w-full h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90">
                  {isBenchmarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Start Benchmark
                </Button>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Box} title="Latest Block" value={latestBlock} unit="number" isBenchmarking={isBenchmarking} />
          <MetricCard icon={RefreshCw} title="Chain Usage Per Second (CUPS)" value={cups} unit="units/sec" isBenchmarking={isBenchmarking}/>
          <MetricCard icon={ArrowRightLeft} title="Effective RPS (Sequential)" value={effectiveRps} unit="req/sec" isBenchmarking={isBenchmarking} />
          <MetricCard icon={Zap} title="Burst RPS (Parallel)" value={burstRps} unit="req/sec" isBenchmarking={isBenchmarking} />
        </div>

      </main>
       <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground bg-card/80 border-border/60 border rounded-full">
          <SlidersHorizontal className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
      <footer className="py-6 text-center text-muted-foreground text-sm">
        Created by <a href="#" className="underline hover:text-foreground">arookiecoder</a>
      </footer>
    </div>
  );
}
