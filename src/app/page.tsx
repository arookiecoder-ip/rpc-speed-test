"use client";

import React, { useState } from 'react';
import {
  Box,
  RefreshCw,
  ArrowRightLeft,
  Zap,
  Loader2,
  Settings2,
  Moon,
  SlidersHorizontal,
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

const MetricCard = ({ icon: Icon, title, value, unit, isBenchmarking }: { icon: React.ElementType, title: string, value: string | number, unit: string, isBenchmarking: boolean }) => (
  <Card className="bg-card/80 border-border/60 text-left">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
        {isBenchmarking && value === '-' ? (
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

export default function Home() {
  const [rpcUrl, setRpcUrl] = useState('https://your-rpc-endpoint.com');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const [latestBlock, setLatestBlock] = useState<string | number>('-');
  const [cups, setCups] = useState<string | number>('-');
  const [effectiveRps, setEffectiveRps] = useState<string | number>('-');
  const [burstRps, setBurstRps] = useState<string | number>('-');

  const handleDetectChain = async () => {
    setIsDetecting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsDetecting(false);
  };

  const handleStartBenchmark = async () => {
    setIsBenchmarking(true);
    setLatestBlock('-');
    setCups('-');
    setEffectiveRps('-');
    setBurstRps('-');

    await new Promise(resolve => setTimeout(resolve, 2000));

    setLatestBlock(Math.floor(Math.random() * 10000000 + 15000000).toLocaleString());
    setCups(Math.floor(Math.random() * (150 - 50 + 1) + 50));
    setEffectiveRps(Math.floor(Math.random() * (120 - 40 + 1) + 40));
    setBurstRps(Math.floor(Math.random() * (200 - 80 + 1) + 80));

    setIsBenchmarking(false);
  };

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
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input
                type="text"
                placeholder="https://your-rpc-endpoint.com"
                className="bg-input border-border/80 flex-grow text-base h-12"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                disabled={isDetecting || isBenchmarking}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button onClick={handleDetectChain} disabled={!rpcUrl || isDetecting || isBenchmarking} className="w-full sm:w-auto h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90">
                  {isDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
                  Detect Chain
                </Button>
                <Button onClick={handleStartBenchmark} disabled={isBenchmarking} className="w-full sm:w-auto h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90">
                  {isBenchmarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Start Benchmark
                </Button>
              </div>
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
