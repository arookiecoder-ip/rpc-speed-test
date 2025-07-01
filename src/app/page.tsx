"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  ChevronDown,
  Loader2,
  Rocket,
  Sparkles,
  Zap,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { getTroubleshootingSuggestions } from './actions';
import { useToast } from '@/hooks/use-toast';
import { ChainIcon } from '@/components/chain-icon';

const formSchema = z.object({
  rpcUrl: z.string().url({ message: "Please enter a valid RPC URL." }),
  chain: z.enum(['evm', 'solana', 'cosmos'], {
    errorMap: () => ({ message: "Please select a chain." }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface BenchmarkResult {
  id: string;
  chain: 'evm' | 'solana' | 'cosmos';
  rpcUrl: string;
  cups: number;
  effectiveRps: number;
  burstRps: number;
  date: string;
  aiSuggestion?: string | null;
  isAiLoading: boolean;
  isAiSuggestionVisible: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rpcUrl: "",
    },
  });

  const handleBenchmark: SubmitHandler<FormValues> = (data) => {
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);

    // Simulate network delay and benchmarking
    setTimeout(() => {
      // Simulate success or failure
      if (Math.random() < 0.1) { // 10% chance of failure
        setError("Failed to connect to the RPC endpoint. Please check the URL and try again.");
        setIsLoading(false);
        return;
      }
      
      const newResult: BenchmarkResult = {
        id: new Date().toISOString(),
        chain: data.chain,
        rpcUrl: data.rpcUrl,
        cups: Math.floor(Math.random() * (150 - 50 + 1) + 50),
        effectiveRps: Math.floor(Math.random() * (120 - 40 + 1) + 40),
        burstRps: Math.floor(Math.random() * (200 - 80 + 1) + 80),
        date: new Date().toLocaleString(),
        isAiLoading: false,
        isAiSuggestionVisible: false,
      };

      setCurrentResult(newResult);
      setHistory(prev => [newResult, ...prev]);
      setIsLoading(false);
      form.reset();
    }, 2000);
  };
  
  const updateResultState = (id: string, updates: Partial<BenchmarkResult>) => {
    const updater = (prev: BenchmarkResult | null) => prev && prev.id === id ? { ...prev, ...updates } : prev;
    setCurrentResult(updater);
    setHistory(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleAiTroubleshoot = async (resultId: string) => {
    const result = history.find(h => h.id === resultId);
    if (!result) return;
    
    updateResultState(resultId, { isAiLoading: true, isAiSuggestionVisible: true });

    const { suggestions, error: aiError } = await getTroubleshootingSuggestions({
      chain: result.chain,
      rpcUrl: result.rpcUrl,
      cups: result.cups,
      effectiveRps: result.effectiveRps,
      burstRps: result.burstRps,
    });
    
    if (aiError) {
      toast({
        variant: 'destructive',
        title: 'AI Troubleshooting Failed',
        description: aiError,
      });
      updateResultState(resultId, { isAiLoading: false, isAiSuggestionVisible: false });
    } else {
      updateResultState(resultId, { aiSuggestion: suggestions, isAiLoading: false });
    }
  };

  const toggleAiSuggestionVisibility = (id: string) => {
    const result = history.find(h => h.id === id);
    if (result && result.aiSuggestion) {
      updateResultState(id, { isAiSuggestionVisible: !result.isAiSuggestionVisible });
    } else if (result) {
      handleAiTroubleshoot(id);
    }
  };


  const ResultCard = ({ result, isCurrent }: { result: BenchmarkResult, isCurrent: boolean }) => (
    <Card className={`overflow-hidden ${isCurrent ? 'shadow-primary/20 shadow-lg' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <ChainIcon chain={result.chain} className="w-6 h-6" />
                    {isCurrent ? "Latest Benchmark" : "Benchmark Result"}
                </CardTitle>
                <CardDescription className="pt-2 truncate">{result.rpcUrl}</CardDescription>
            </div>
             <Button variant="ghost" size="icon" onClick={() => toggleAiSuggestionVisibility(result.id)}>
                <ChevronDown className={`transition-transform duration-200 ${result.isAiSuggestionVisible ? 'rotate-180' : ''}`} />
             </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <MetricItem icon={Activity} label="Chain Usage / Sec (CUPS)" value={result.cups} />
          <MetricItem icon={Zap} label="Effective RPS" value={result.effectiveRps} />
          <MetricItem icon={Rocket} label="Burst RPS" value={result.burstRps} />
        </div>
      </CardContent>
      {result.isAiSuggestionVisible && (
        <CardFooter className="bg-muted/50 p-6 flex flex-col items-start gap-4">
            <div className='w-full flex justify-between items-center'>
                <h3 className="font-headline text-lg flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5" />
                    AI-Powered Troubleshooting
                </h3>
                 <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => updateResultState(result.id, { isAiSuggestionVisible: false })}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
            {result.isAiLoading ? (
                 <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            ) : (
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {result.aiSuggestion}
                </div>
            )}
        </CardFooter>
      )}
    </Card>
  );

  const MetricItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number | string }) => (
    <div className="flex items-start gap-4">
      <div className="bg-accent text-accent-foreground p-3 rounded-lg">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-bold font-headline">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold font-headline text-primary tracking-tight">
            ChainDoctor
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
            Benchmark your RPC endpoints. Get AI-powered insights to diagnose and resolve issues instantly.
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">New Benchmark</CardTitle>
            <CardDescription>Enter an RPC URL and select its chain to start the test.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBenchmark)} className="grid sm:grid-cols-5 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="rpcUrl"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>RPC Endpoint URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://mainnet.infura.io/v3/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chain"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Chain</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="evm">EVM</SelectItem>
                          <SelectItem value="solana">Solana</SelectItem>
                          <SelectItem value="cosmos">Cosmos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-1 pt-8">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                    ) : 'Run Test'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {error && (
            <Alert variant="destructive" className="mb-8">
                <AlertTitle>Benchmark Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {isLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div className="flex items-center gap-4" key={i}>
                        <Skeleton className="w-16 h-16 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>
        )}
        
        {currentResult && !isLoading && <ResultCard result={currentResult} isCurrent={true} />}

        {history.length > 0 && (
            <>
                <Separator className="my-12" />
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold font-headline text-center">Benchmark History</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>RPC Endpoint</TableHead>
                                <TableHead>Chain</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">CUPS</TableHead>
                                <TableHead className="text-right">RPS</TableHead>
                                <TableHead className="text-right">Burst RPS</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(item => (
                                <React.Fragment key={item.id}>
                                    <TableRow className={item.id === currentResult?.id ? 'bg-accent/30' : ''}>
                                        <TableCell className="font-medium max-w-xs truncate">{item.rpcUrl}</TableCell>
                                        <TableCell>
                                            <div className='flex items-center gap-2'>
                                                <ChainIcon chain={item.chain} className="w-4 h-4" />
                                                <span className="capitalize">{item.chain}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='text-muted-foreground'>{item.date}</TableCell>
                                        <TableCell className="text-right">{item.cups}</TableCell>
                                        <TableCell className="text-right">{item.effectiveRps}</TableCell>
                                        <TableCell className="text-right">{item.burstRps}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleAiSuggestionVisibility(item.id)}
                                                disabled={item.isAiLoading}
                                            >
                                                {item.isAiLoading ? (
                                                     <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : <Sparkles className="h-4 w-4" />}
                                                <span className="ml-2 hidden sm:inline">
                                                    {item.isAiSuggestionVisible ? 'Hide AI' : 'Ask AI'}
                                                </span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {item.isAiSuggestionVisible && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="p-0 !border-b-0">
                                                <div className="bg-muted/30 p-4">
                                                {item.isAiLoading ? (
                                                    <div className="flex items-center gap-3 text-muted-foreground">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Generating AI suggestions...</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h4 className="font-headline text-md flex items-center gap-2 text-primary mb-2">
                                                            <Sparkles className="w-4 h-4" />
                                                            AI Troubleshooting
                                                        </h4>
                                                        <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap font-body">
                                                          {item.aiSuggestion}
                                                        </div>
                                                    </div>
                                                )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </>
        )}
      </main>
    </div>
  );
}
