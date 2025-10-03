import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface TransactionData {
  timestamp: number;
  chainId: number;
  method: 'incrementer' | 'direct';
  success: boolean;
  gasUsed?: bigint;
  blockNumber: bigint;
}

interface AnalyticsDashboardProps {
  transactions: TransactionData[];
  counterValue: bigint;
  lastIncrementer: { chainId: bigint; sender: string };
}

export function AnalyticsDashboard({ transactions, counterValue, lastIncrementer }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [isLive, setIsLive] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const filteredTxns = transactions.filter(tx => 
      now - tx.timestamp <= timeRanges[timeRange]
    );

    const totalTransactions = filteredTxns.length;
    const successfulTransactions = filteredTxns.filter(tx => tx.success).length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const avgTransactionsPerHour = timeRange === '1h' ? totalTransactions : totalTransactions / (timeRanges[timeRange] / (60 * 60 * 1000));

    // Method distribution
    const methodCounts = filteredTxns.reduce((acc, tx) => {
      acc[tx.method] = (acc[tx.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Chain distribution
    const chainCounts = filteredTxns.reduce((acc, tx) => {
      acc[tx.chainId] = (acc[tx.chainId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalTransactions,
      successfulTransactions,
      successRate,
      avgTransactionsPerHour,
      methodCounts,
      chainCounts,
    };
  }, [transactions, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    
    const filteredTxns = transactions.filter(tx => 
      now - tx.timestamp <= timeRanges[timeRange]
    );

    // Time series data
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const labels: string[] = [];
    const data: number[] = [];
    
    for (let i = 0; i < timeRanges[timeRange]; i += interval) {
      const start = now - timeRanges[timeRange] + i;
      const end = start + interval;
      const count = filteredTxns.filter(tx => tx.timestamp >= start && tx.timestamp < end).length;
      
      labels.push(new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      data.push(count);
    }

    return { labels, data };
  }, [transactions, timeRange]);

  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Transactions',
        data: chartData.data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const methodChartData = {
    labels: ['Counter Incrementer', 'Direct Messenger'],
    datasets: [
      {
        data: [metrics.methodCounts.incrementer || 0, metrics.methodCounts.direct || 0],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(168, 85, 247, 0.8)'],
        borderColor: ['rgb(34, 197, 94)', 'rgb(168, 85, 247)'],
        borderWidth: 2,
      },
    ],
  };

  const chainChartData = {
    labels: Object.keys(metrics.chainCounts).map(chainId => `Chain ${chainId}`),
    datasets: [
      {
        data: Object.values(metrics.chainCounts),
        backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)'],
        borderColor: ['rgb(239, 68, 68)', 'rgb(59, 130, 246)'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time cross-chain transaction monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "default" : "secondary"}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isLive ? 'Live' : 'Paused'}
          </Badge>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgTransactionsPerHour.toFixed(1)} per hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.successfulTransactions} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Counter</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counterValue.toString()}</div>
            <p className="text-xs text-muted-foreground">
              Last from Chain {lastIncrementer.chainId.toString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.length > 0 ? 'Active' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.length > 0 
                ? `${Math.floor((Date.now() - transactions[transactions.length - 1].timestamp) / 1000)}s ago`
                : 'No recent activity'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
            <CardDescription>Cross-chain activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Line data={lineChartData} options={chartOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Method Distribution</CardTitle>
            <CardDescription>Transaction methods used</CardDescription>
          </CardHeader>
          <CardContent>
            <Doughnut data={methodChartData} options={{ responsive: true }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chain Activity</CardTitle>
            <CardDescription>Transactions per chain</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={chainChartData} options={chartOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest cross-chain operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(-5).reverse().map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${tx.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-mono">
                      {tx.method === 'incrementer' ? 'Incrementer' : 'Direct'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chain {tx.chainId} • {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No transactions yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
