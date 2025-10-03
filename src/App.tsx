import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, BarChart3 } from 'lucide-react';
import {
  useReadContracts,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { useAnalytics } from '@/hooks/use-analytics';
import { supersimL2A, supersimL2B } from '@eth-optimism/viem/chains';
import { contracts, l2ToL2CrossDomainMessengerAbi } from '@eth-optimism/viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sortBy } from '@/lib/utils';
import { encodeFunctionData } from 'viem';
import { crossChainCounterAbi } from '@/abi/crossChainCounterAbi';
import { crossChainCounterIncrementerAbi } from '@/abi/crossChainCounterIncrementerAbi';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  devAccount: privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  ),
  sourceChain: supersimL2A,
  destinationChain: supersimL2B,
  contracts: {
    counter: {
      address: '0x1b68f70248d6d2176c88d9285564cd23173d41d3',
    },
    counterIncrementer: {
      address: '0x52f498e866bdebec46b6939080a66332e2a1cb1e',
    },
  },
} as const;

// ============================================================================
// Source Chain Components (Chain A)
// ============================================================================

const CounterIncrementer = ({ onTransaction }: { onTransaction: (tx: any) => void }) => {
  const { data, writeContract, isPending } = useWriteContract();
  const { isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: data,
    chainId: CONFIG.sourceChain.id,
    pollingInterval: 1000,
  });

  const buttonText = isWaitingForReceipt
    ? 'Waiting for confirmation...'
    : isPending
      ? 'Sending...'
      : 'Increment';

  const handleIncrement = () => {
    writeContract({
      account: CONFIG.devAccount,
      chainId: CONFIG.sourceChain.id,
      address: CONFIG.contracts.counterIncrementer.address,
      abi: crossChainCounterIncrementerAbi,
      functionName: 'increment',
      args: [BigInt(CONFIG.destinationChain.id), CONFIG.contracts.counter.address],
    });
    
    // Track transaction for analytics
    onTransaction({
      timestamp: Date.now(),
      chainId: CONFIG.sourceChain.id,
      method: 'incrementer' as const,
      success: true,
      blockNumber: BigInt(0), // Will be updated when we get the receipt
    });
    
    toast.success('Cross-chain message sent!', {
      description: `Incrementing counter on ${CONFIG.destinationChain.name}`,
      duration: 3000,
    });
  };

  return (
    <>
      <div className="text-sm text-muted-foreground">
        Method 1: Increment the counter by calling the <span className="font-mono">increment</span>{' '}
        function on the <span className="font-mono">CrossChainCounterIncrementer</span> contract.
      </div>
      <Card>
        <CardHeader className="font-mono">
          <CardTitle className="font-mono">CrossChainCounterIncrementer</CardTitle>
          <CardDescription className="font-mono">
            {CONFIG.contracts.counterIncrementer.address}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="font-mono text-xs space-y-2">
              <div className="font-bold">
                increment(uint256 counterChainId, address counterAddress)
              </div>
              <div className="pl-4">
                <div>counterChainId: {CONFIG.destinationChain.id}</div>
                <div>counterAddress: {CONFIG.contracts.counter.address}</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex">
          <Button
            className="flex-1"
            onClick={handleIncrement}
            disabled={isPending || isWaitingForReceipt}
          >
            {(isPending || isWaitingForReceipt) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {buttonText}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

const DirectMessengerCall = ({ onTransaction }: { onTransaction: (tx: any) => void }) => {
  const { writeContract, isPending, data } = useWriteContract();
  const { isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: data,
    chainId: CONFIG.sourceChain.id,
    pollingInterval: 1000,
  });

  const buttonText = isWaitingForReceipt
    ? 'Waiting for confirmation...'
    : isPending
      ? 'Sending...'
      : 'Send Message';

  const incrementFunctionData = encodeFunctionData({
    abi: crossChainCounterAbi,
    functionName: 'increment',
  });

  const handleDirectMessage = () => {
    writeContract({
      account: CONFIG.devAccount,
      chainId: CONFIG.sourceChain.id,
      address: contracts.l2ToL2CrossDomainMessenger.address,
      abi: l2ToL2CrossDomainMessengerAbi,
      functionName: 'sendMessage',
      args: [
        BigInt(CONFIG.destinationChain.id),
        CONFIG.contracts.counter.address,
        incrementFunctionData,
      ],
    });
    
    // Track transaction for analytics
    onTransaction({
      timestamp: Date.now(),
      chainId: CONFIG.sourceChain.id,
      method: 'direct' as const,
      success: true,
      blockNumber: BigInt(0), // Will be updated when we get the receipt
    });
    
    toast.success('Direct message sent!', {
      description: `Using L2ToL2CrossDomainMessenger to ${CONFIG.destinationChain.name}`,
      duration: 3000,
    });
  };

  return (
    <>
      <div className="text-sm text-muted-foreground">
        Method 2: Increment the counter by sending message by directly calling the{' '}
        <span className="font-mono">sendMessage</span> function on the{' '}
        <span className="font-mono">L2ToL2CrossDomainMessenger</span> contract.
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-mono">L2ToL2CrossDomainMessenger</CardTitle>
          <CardDescription className="font-mono">
            {contracts.l2ToL2CrossDomainMessenger.address}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="font-mono text-xs space-y-2">
              <div className="font-bold">
                sendMessage(uint256 _destination, address _target, bytes calldata _message)
              </div>
              <div className="pl-4">
                <div>_destination: {CONFIG.destinationChain.id}</div>
                <div>_address: {CONFIG.contracts.counter.address}</div>
                <div>
                  _message: {incrementFunctionData} <span className="font-bold">increment()</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="flex-1"
            onClick={handleDirectMessage}
            disabled={isPending || isWaitingForReceipt}
          >
            {(isPending || isWaitingForReceipt) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {buttonText}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

const SourceChain = ({ onTransaction }: { onTransaction: (tx: any) => void }) => (
  <div className="flex-1 flex flex-col gap-4 p-4">
    <div className="flex items-center justify-between">
      <div className="text-xl font-semibold">
        Chain: {CONFIG.sourceChain.name} ({CONFIG.sourceChain.id})
      </div>
    </div>
    <CounterIncrementer onTransaction={onTransaction} />
    <Separator />
    <DirectMessengerCall onTransaction={onTransaction} />
  </div>
);

// ============================================================================
// Destination Chain Components (Chain B)
// ============================================================================

const DestinationChain = () => {
  const [logs, setLogs] = useState<
    Array<{
      senderChainId: bigint;
      sender: string;
      newValue: bigint;
      transactionHash: string;
      blockNumber: bigint;
    }>
  >([]);

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: CONFIG.contracts.counter.address,
        abi: crossChainCounterAbi,
        functionName: 'number',
        chainId: CONFIG.destinationChain.id,
      },
      {
        address: CONFIG.contracts.counter.address,
        abi: crossChainCounterAbi,
        functionName: 'lastIncrementer',
        chainId: CONFIG.destinationChain.id,
      },
    ],
  });

  useWatchContractEvent({
    address: CONFIG.contracts.counter.address,
    abi: crossChainCounterAbi,
    eventName: 'CounterIncremented',
    chainId: CONFIG.destinationChain.id,
    onLogs: newLogs => {
      setLogs(prevLogs => [
        ...prevLogs,
        ...newLogs.map(log => ({
          senderChainId: log.args.senderChainId!,
          sender: log.args.sender!,
          newValue: log.args.newValue!,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })),
      ]);
      refetch();
      
      // Show notification for each new increment
      newLogs.forEach(log => {
        toast.success('Counter incremented! 🎉', {
          description: `New value: ${log.args.newValue?.toString()} from chain ${log.args.senderChainId?.toString()}`,
          duration: 4000,
        });
      });
    },
  });

  const sortedLogs = useMemo(() => sortBy(logs, log => -log.blockNumber), [logs]);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <div className="text-xl font-semibold">
        Chain: {CONFIG.destinationChain.name} ({CONFIG.destinationChain.id})
      </div>
      <div className="text-sm text-muted-foreground">
        Watch for state changes as the counter is incremented from the source chain.
      </div>
      <Card>
        <CardHeader className="font-mono">
          <CardTitle className="font-mono">CrossChainCounter</CardTitle>
          <CardDescription>{CONFIG.contracts.counter.address}</CardDescription>
        </CardHeader>

        {/* Counter Current State */}
        <CardContent className="space-y-4 font-mono pb-4">
          <div className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground shrink-0">number:</span>
            <span className="font-mono text-right">{data?.[0]?.result?.toString() ?? '—'}</span>
          </div>
          <div className="space-y-2">
            <div className="text-muted-foreground">lastIncrementer:</div>
            <div className="pl-4 flex flex-col gap-2">
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground shrink-0">chainId:</span>
                <span className="font-mono text-right">
                  {data?.[1]?.result?.[0]?.toString() ?? '—'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground shrink-0">sender:</span>
                <span className="font-mono text-right truncate">
                  {data?.[1]?.result?.[1] ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <Separator />

        {/* Event Logs */}
        <CardFooter className="p-4">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <div>
                Listening for <span className="font-mono">CounterIncremented</span> events...
              </div>
            </div>
            <div className="space-y-1">
              {sortedLogs.length > 0 && (
                <div className="text-sm text-muted-foreground font-mono grid grid-cols-4 gap-4 px-2">
                  <div>blockNumber</div>
                  <div>senderChainId</div>
                  <div>sender</div>
                  <div>newValue</div>
                </div>
              )}
              {sortedLogs.map(log => (
                <div
                  key={log.transactionHash}
                  className="p-2 rounded-md hover:bg-muted transition-colors grid grid-cols-4 gap-4 text-sm font-mono"
                >
                  <div>{log.blockNumber.toString()}</div>
                  <div>{log.senderChainId.toString()}</div>
                  <div className="truncate">{log.sender}</div>
                  <div>{log.newValue.toString()}</div>
                </div>
              ))}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

// ============================================================================
// Main App
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState<'counter' | 'analytics'>('counter');
  const analytics = useAnalytics();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <Zap className="h-6 w-6" />
              <span className="font-bold">Route101</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <span className="text-sm text-muted-foreground">
                Cross-Chain Counter Demo
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Cross-Chain Counter</h1>
          <p className="text-muted-foreground">
            Experience the power of Superchain interop with real-time cross-chain messaging
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'counter' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('counter')}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Counter Demo
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </div>
        
        {activeTab === 'counter' && (
          <div className="flex gap-4">
            <SourceChain onTransaction={analytics.addTransaction} />
            <DestinationChain />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            transactions={analytics.transactions}
            counterValue={BigInt(0)} // This will be updated with real data
            lastIncrementer={{ chainId: BigInt(0), sender: '0x...' }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
