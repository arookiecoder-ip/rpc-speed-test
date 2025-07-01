
"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  RefreshCw,
  ArrowRightLeft,
  Zap,
  Loader2,
  ServerCrash,
  Square,
  History,
  Trash2,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast"
import { 
    detectChain as detectChainAction, 
    getLatestBlock,
    getCUPS,
    getEffectiveRps,
    getBurstRps
} from '@/app/actions';
import { sendFeedback } from '@/app/feedbackActions';
import { CHAIN_NAMES } from '@/lib/rpc';
import { ChainIcon } from '@/components/chain-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChainSelector } from '@/components/chain-selector';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type BenchmarkResult = {
  id: number;
  rpcUrl: string;
  chainName: string | null;
  latestBlock: string | number;
  cups: string | number;
  effectiveRps: string | number;
  burstRps: string | number;
  timestamp: string;
};

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
  const [history, setHistory] = useState<BenchmarkResult[]>([]);

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

  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('benchmarkHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      toast({ title: "Could not load history", description: "Your benchmark history is stored in your browser, but it could not be loaded.", variant: "destructive" });
    }
  }, [toast]);


  const handleParamChange = (param: keyof typeof benchmarkParams, checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setBenchmarkParams(prev => ({ ...prev, [param]: checked }));
    }
  };

  const handleRpcUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRpcUrl(e.target.value);
    setSelectedChainId('auto');
    setDetectedChainId(null);
    setDetectedChainName(null);
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
      let finalChainName = CHAIN_NAMES[selectedChainId] || "Unknown";

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
          finalChainName = detectResult.chainName;
          setDetectedChainId(detectResult.chainId);
          setDetectedChainName(detectResult.chainName);
          toast({ title: "Success", description: `Auto-detected ${detectResult.chainName} chain.` });
      } else {
        setDetectedChainId(selectedChainId);
        setDetectedChainName(finalChainName);
      }

      const formData = new FormData();
      formData.append('rpcUrl', rpcUrl);
      formData.append('chainId', finalChainId);

      let tempLatestBlock: string | number = '-';
      let tempCups: string | number = '-';
      let tempEffectiveRps: string | number = '-';
      let tempBurstRps: string | number = '-';
      
      if (benchmarkParams.latestBlock) {
        const initialBlockResult = await getLatestBlock(formData);
        if (isCancelledRef.current) { setIsBenchmarking(false); return; }

        if (initialBlockResult?.error) {
            setLatestBlock('Error');
            toast({ title: "Connection Failed", description: initialBlockResult.error, variant: "destructive" });
            setIsBenchmarking(false);
            return;
        }
        tempLatestBlock = initialBlockResult.latestBlock?.toLocaleString() ?? '-';
        setLatestBlock(tempLatestBlock);
        setIsPollingBlock(true);
      }
      

      if (benchmarkParams.cups) {
        const cupsResult = await getCUPS(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (cupsResult?.error) { setCups('Error'); tempCups = 'Error'; }
        else if (cupsResult) { setCups(cupsResult.cups ?? '-'); tempCups = cupsResult.cups ?? '-'; }
      }
      
      if (benchmarkParams.effectiveRps) {
        const effectiveRpsResult = await getEffectiveRps(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (effectiveRpsResult?.error) { setEffectiveRps('Error'); tempEffectiveRps = 'Error'; }
        else if (effectiveRpsResult) { setEffectiveRps(effectiveRpsResult.effectiveRps ?? '-'); tempEffectiveRps = effectiveRpsResult.effectiveRps ?? '-'; }
      }

      if (benchmarkParams.burstRps) {
        const burstRpsResult = await getBurstRps(formData);
        if (isCancelledRef.current) { stopPolling(); setIsBenchmarking(false); return; }
        if (burstRpsResult?.error) { setBurstRps('Error'); tempBurstRps = 'Error'; }
        else if (burstRpsResult) { setBurstRps(burstRpsResult.burstRps ?? '-'); tempBurstRps = burstRpsResult.burstRps ?? '-'; }
      }
      
      setIsBenchmarking(false);

      if (!benchmarkParams.latestBlock) {
        stopPolling();
      }

      if (!isCancelledRef.current) {
          toast({ title: "Benchmark Complete", description: "Selected metrics gathered." });

          const newResult: BenchmarkResult = {
              id: Date.now(),
              rpcUrl: rpcUrl,
              chainName: finalChainName,
              latestBlock: benchmarkParams.latestBlock ? tempLatestBlock : 'N/A',
              cups: benchmarkParams.cups ? tempCups : 'N/A',
              effectiveRps: benchmarkParams.effectiveRps ? tempEffectiveRps : 'N/A',
              burstRps: benchmarkParams.burstRps ? tempBurstRps : 'N/A',
              timestamp: new Date().toLocaleString(),
          };

          const newHistory = [newResult, ...history].slice(0, 50); // Keep last 50 results
          setHistory(newHistory);
          localStorage.setItem('benchmarkHistory', JSON.stringify(newHistory));
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
  }, [isPollingBlock, rpcUrl, detectedChainId, toast]);

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('benchmarkHistory');
    toast({ title: "History Cleared" });
  };

  const handleFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSendingFeedback(true);

    const formData = new FormData();
    formData.append('feedback', feedbackText);
    const result = await sendFeedback(formData);

    if (result.error) {
        toast({ title: "Feedback Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Feedback Sent", description: result.success });
        setFeedbackText('');
        setIsFeedbackDialogOpen(false);
    }
    
    setIsSendingFeedback(false);
  }

  const noParamsSelected = Object.values(benchmarkParams).every(v => !v);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center text-center gap-12">
        <div className="relative w-full">
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl sm:text-6xl font-bold font-headline" style={{ color: 'hsl(var(--primary))' }}>
              ChainDoctor
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Benchmark your blockchain RPC endpoint for speed and reliability.
            </p>
          </div>
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
        </div>

        <Card className="w-full max-w-3xl p-6 sm:p-8 bg-transparent border-border/60">
          <CardHeader className="text-center p-0 mb-6">
            <CardTitle className="font-headline text-2xl">Configuration</CardTitle>
            <CardDescription>Enter your RPC URL and select parameters to begin.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  type="text"
                  placeholder="https://your-rpc-endpoint.com"
                  className="bg-input border-border/80 flex-grow text-base h-12"
                  value={rpcUrl}
                  onChange={handleRpcUrlChange}
                  disabled={isBenchmarking}
                  suppressHydrationWarning
                />
                <ChainSelector 
                  value={selectedChainId}
                  onChange={setSelectedChainId}
                  disabled={isBenchmarking}
                />
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground h-8">
                  {(isBenchmarking && selectedChainId === 'auto') ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (detectedChainId && detectedChainName) ? (
                    <DetectedChain chainId={detectedChainId} chainName={detectedChainName} />
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-left pt-2 pb-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="latestBlock" className="text-sm font-medium">Live Block Number</Label>
                        <Switch id="latestBlock" checked={benchmarkParams.latestBlock} onCheckedChange={(checked) => handleParamChange('latestBlock', checked as boolean)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="cups" className="text-sm font-medium">Chain Usage Per Second (CUPS)</Label>
                        <Switch id="cups" checked={benchmarkParams.cups} onCheckedChange={(checked) => handleParamChange('cups', checked as boolean)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="effectiveRps" className="text-sm font-medium">Effective RPS (Sequential)</Label>
                        <Switch id="effectiveRps" checked={benchmarkParams.effectiveRps} onCheckedChange={(checked) => handleParamChange('effectiveRps', checked as boolean)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="burstRps" className="text-sm font-medium">Burst RPS (Parallel)</Label>
                        <Switch id="burstRps" checked={benchmarkParams.burstRps} onCheckedChange={(checked) => handleParamChange('burstRps', checked as boolean)} />
                    </div>
                </div>
                
               <Button 
                onClick={isBenchmarking ? handleStopBenchmark : handleStartBenchmark}
                disabled={isBenchmarking ? false : (!rpcUrl || noParamsSelected)}
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

        {history.length > 0 && (
          <Card className="w-full max-w-4xl bg-transparent border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="text-left">
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <History className="w-6 h-6" />
                        Benchmark History
                    </CardTitle>
                    <CardDescription>Your last 50 results are saved in your browser.</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={handleClearHistory} aria-label="Clear History">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RPC Endpoint</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead className="text-right">CUPS</TableHead>
                    <TableHead className="text-right">Effective RPS</TableHead>
                    <TableHead className="text-right">Burst RPS</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-xs truncate">{item.rpcUrl}</TableCell>
                      <TableCell>{item.chainName}</TableCell>
                      <TableCell className="text-right">{item.cups}</TableCell>
                      <TableCell className="text-right">{item.effectiveRps}</TableCell>
                      <TableCell className="text-right">{item.burstRps}</TableCell>
                      <TableCell className="text-right">{item.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-4">
        <span>Created with <span className="text-red-500">❤️</span> by <a href="https://github.com/arookiecoder-ip" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">arookiecoder</a></span>
        
        <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Feedback
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleFeedbackSubmit}>
                    <DialogHeader>
                        <DialogTitle>Provide Feedback</DialogTitle>
                        <DialogDescription>
                            We'd love to hear your thoughts on what's working and what could be improved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Textarea 
                            id="feedback"
                            placeholder="Your feedback..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            className="col-span-3"
                            rows={5}
                            disabled={isSendingFeedback}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSendingFeedback || feedbackText.length < 10}>
                            {isSendingFeedback ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>) : 'Send Feedback'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </footer>
    </div>
  );
}
