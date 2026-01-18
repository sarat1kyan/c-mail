import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  MessageSquare,
  Award,
} from 'lucide-react';
import { useStore } from '../store';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const { dashboardSummary, loadDashboard, categories } = useStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadDashboard(period);
  }, [period, loadDashboard]);

  // Time of day data (mock)
  const timeOfDayData = {
    labels: Array.from({ length: 24 }, (_, i) => 
      `${i === 0 ? 12 : i > 12 ? i - 12 : i}${i < 12 ? 'am' : 'pm'}`
    ),
    datasets: [
      {
        label: 'Emails Received',
        data: [2, 1, 0, 0, 1, 3, 8, 15, 22, 18, 12, 10, 8, 11, 14, 16, 12, 8, 6, 5, 4, 3, 2, 2],
        backgroundColor: 'rgba(12, 140, 230, 0.6)',
        borderColor: 'rgb(12, 140, 230)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Category distribution
  const categoryData = {
    labels: categories.slice(0, 6).map(c => c.name),
    datasets: [
      {
        data: categories.slice(0, 6).map(c => c.count),
        backgroundColor: categories.slice(0, 6).map(c => c.color),
        borderWidth: 0,
      },
    ],
  };

  // Trend data
  const trendData = {
    labels: dashboardSummary?.trends.labels || [],
    datasets: [
      {
        label: 'Emails',
        data: dashboardSummary?.trends.received || [],
        fill: true,
        borderColor: 'rgb(12, 140, 230)',
        backgroundColor: 'rgba(12, 140, 230, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(12, 140, 230)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'white',
        bodyColor: 'rgb(148, 163, 184)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgb(100, 116, 139)' },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: 'rgb(100, 116, 139)' },
      },
    },
  };

  // Mock analytics data
  const analytics = {
    responseTime: '2.4 hours',
    peakHour: '9 AM',
    topSender: dashboardSummary?.topSenders?.[0]?.name || 'N/A',
    readRate: '78%',
    weeklyTrend: '+12%',
    topCategory: categories[0]?.name || 'N/A',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Email Analytics
          </h1>
          <p className="text-surface-500 mt-1">
            Insights into your email patterns and behavior
          </p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-surface-800/50 rounded-lg">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all
              ${period === 'week'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-surface-400 hover:text-surface-200'
              }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all
              ${period === 'month'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-surface-400 hover:text-surface-200'
              }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 stagger-children">
        <motion.div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Avg Response</p>
              <p className="text-xl font-display font-semibold text-surface-100">
                {analytics.responseTime}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-amber/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Peak Hour</p>
              <p className="text-xl font-display font-semibold text-surface-100">
                {analytics.peakHour}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-emerald/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent-emerald" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Read Rate</p>
              <p className="text-xl font-display font-semibold text-surface-100">
                {analytics.readRate}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-violet" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Weekly Trend</p>
              <p className="text-xl font-display font-semibold text-accent-emerald">
                {analytics.weeklyTrend}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Email Volume Trend */}
        <div className="col-span-2 glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Email Volume Over Time
          </h2>
          <div className="h-64">
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Category Distribution
          </h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={categoryData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'rgb(148, 163, 184)',
                      padding: 12,
                      usePointStyle: true,
                      pointStyle: 'circle',
                    },
                  },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Time of Day Analysis */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-display font-medium text-surface-100">
              Time of Day Analysis
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              When you receive the most emails
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-surface-500">Best time to respond</p>
            <p className="text-lg font-medium text-primary-400">10 AM - 11 AM</p>
          </div>
        </div>
        <div className="h-48">
          <Bar data={timeOfDayData} options={chartOptions} />
        </div>
      </div>

      {/* Top Senders & Topics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Senders */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Top Senders
          </h2>
          <div className="space-y-3">
            {dashboardSummary?.topSenders?.slice(0, 5).map((sender, i) => (
              <div
                key={sender.email}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/30"
              >
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center 
                  justify-center text-sm font-medium text-primary-400">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">
                    {sender.name}
                  </p>
                  <p className="text-xs text-surface-500 truncate">{sender.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-surface-300">{sender.count}</p>
                  <p className="text-xs text-surface-500">emails</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sender Importance */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Sender Importance Scores
          </h2>
          <div className="space-y-4">
            {dashboardSummary?.topSenders?.slice(0, 5).map((sender) => {
              const score = Math.floor(Math.random() * 40) + 60; // Mock score
              return (
                <div key={sender.email}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-surface-300">{sender.name}</span>
                    <span className="text-sm font-medium text-primary-400">{score}</span>
                  </div>
                  <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-surface-500 mt-4">
            Scores based on email frequency, read rate, and category importance
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-6 h-6 text-accent-amber" />
          <h2 className="text-lg font-display font-medium text-surface-100">
            Email Insights
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surface-800/30">
            <p className="text-surface-500 text-sm">Most Active Day</p>
            <p className="text-xl font-display font-semibold text-surface-100 mt-1">
              Tuesday
            </p>
            <p className="text-xs text-surface-500 mt-1">
              32% more emails than average
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-800/30">
            <p className="text-surface-500 text-sm">Unsubscribe Potential</p>
            <p className="text-xl font-display font-semibold text-surface-100 mt-1">
              23 newsletters
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Not opened in 30+ days
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-800/30">
            <p className="text-surface-500 text-sm">Response Efficiency</p>
            <p className="text-xl font-display font-semibold text-accent-emerald mt-1">
              85% within 4 hours
            </p>
            <p className="text-xs text-surface-500 mt-1">
              For important emails
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

