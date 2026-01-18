import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import {
  Mail,
  MailOpen,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowUpRight,
  Sparkles,
  Landmark,
  Briefcase,
  Megaphone,
  Star,
  Users,
  ShoppingCart,
  Plane,
  FileText,
  Inbox,
} from 'lucide-react';
import { useStore } from '../store';
import { format, formatDistanceToNow } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const categoryIcons: Record<string, any> = {
  financial: Landmark,
  hr: Briefcase,
  marketing: Megaphone,
  important: Star,
  social: Users,
  shopping: ShoppingCart,
  travel: Plane,
  bills: FileText,
  uncategorized: Inbox,
};

const periodOptions = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function Dashboard() {
  const { dashboardSummary, loadDashboard, isLoading, accounts } = useStore();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboard(period);
  }, [period, loadDashboard]);

  const chartData = {
    labels: dashboardSummary?.trends.labels || [],
    datasets: [
      {
        label: 'Emails Received',
        data: dashboardSummary?.trends.received || [],
        fill: true,
        borderColor: 'rgb(12, 140, 230)',
        backgroundColor: 'rgba(12, 140, 230, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(12, 140, 230)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
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

  if (accounts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-surface-100 mb-3">
            Welcome to C-Mail Intelligence
          </h1>
          <p className="text-surface-400 mb-6">
            Connect your email accounts to get started with intelligent email management,
            automatic categorization, and powerful cleanup tools.
          </p>
          <a
            href="/accounts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-400
              text-white font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Add Your First Account
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Executive Dashboard
          </h1>
          <p className="text-surface-500 mt-1">
            Your email intelligence at a glance
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-2 p-1 bg-surface-800/50 rounded-lg">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all
                ${period === opt.value
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-surface-400 hover:text-surface-200'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 stagger-children">
        <motion.div
          className="glass rounded-xl p-5 hover:shadow-glow transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-500 text-sm">Total Emails</p>
              <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
                {dashboardSummary?.totalEmails.toLocaleString() || '—'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <TrendingUp className="w-4 h-4 text-accent-emerald" />
            <span className="text-accent-emerald">{dashboardSummary?.weekCount || 0}</span>
            <span className="text-surface-500">this week</span>
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-xl p-5 hover:shadow-glow transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-500 text-sm">Unread</p>
              <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
                {dashboardSummary?.unreadCount || '—'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-amber/10 flex items-center justify-center">
              <MailOpen className="w-6 h-6 text-accent-amber" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-surface-500">
              {dashboardSummary?.totalEmails 
                ? Math.round((dashboardSummary.unreadCount / dashboardSummary.totalEmails) * 100)
                : 0}% of inbox
            </span>
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-xl p-5 hover:shadow-glow transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-500 text-sm">Today</p>
              <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
                {dashboardSummary?.todayCount || '—'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-violet/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent-violet" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <Clock className="w-4 h-4 text-surface-500" />
            <span className="text-surface-500">Last sync: Just now</span>
          </div>
        </motion.div>

        <motion.div
          className="glass rounded-xl p-5 hover:shadow-glow transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-500 text-sm">Critical</p>
              <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
                {dashboardSummary?.criticalEmails.length || '0'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-rose/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-rose" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-accent-rose">Requires attention</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Email Trends Chart */}
        <div className="col-span-2 glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Email Activity
          </h2>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Critical Emails */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-medium text-surface-100">
              Needs Attention
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-accent-rose/10 text-accent-rose rounded-full">
              {dashboardSummary?.criticalEmails.length || 0} emails
            </span>
          </div>
          
          <div className="space-y-3">
            {dashboardSummary?.criticalEmails.slice(0, 4).map((email) => (
              <div
                key={email.id}
                className="p-3 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 
                  transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate">
                      {email.fromName || email.from}
                    </p>
                    <p className="text-sm text-surface-400 truncate mt-0.5">
                      {email.subject}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-surface-500 group-hover:text-primary-400 
                    opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <p className="text-xs text-surface-500 mt-2">
                  {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                </p>
              </div>
            ))}
            
            {(!dashboardSummary?.criticalEmails || dashboardSummary.criticalEmails.length === 0) && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent-emerald/10 
                  flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-accent-emerald" />
                </div>
                <p className="text-surface-400 text-sm">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Breakdown & Insights */}
      <div className="grid grid-cols-2 gap-6">
        {/* Category Stats */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Email Categories
          </h2>
          
          <div className="space-y-3">
            {dashboardSummary?.categories.slice(0, 6).map((cat) => {
              const Icon = categoryIcons[cat.category] || Inbox;
              return (
                <div key={cat.category} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-200 capitalize">
                        {cat.category}
                      </span>
                      <span className="text-sm text-surface-400">
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
            Insights & Suggestions
          </h2>
          
          <div className="space-y-3">
            {dashboardSummary?.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-lg border ${
                  insight.type === 'warning'
                    ? 'bg-accent-amber/5 border-accent-amber/20'
                    : insight.type === 'success'
                    ? 'bg-accent-emerald/5 border-accent-emerald/20'
                    : 'bg-primary-500/5 border-primary-500/20'
                }`}
              >
                <h3 className={`text-sm font-medium ${
                  insight.type === 'warning'
                    ? 'text-accent-amber'
                    : insight.type === 'success'
                    ? 'text-accent-emerald'
                    : 'text-primary-400'
                }`}>
                  {insight.title}
                </h3>
                <p className="text-sm text-surface-400 mt-1">
                  {insight.description}
                </p>
                {insight.action && (
                  <button className="text-sm text-primary-400 hover:text-primary-300 mt-2 
                    flex items-center gap-1">
                    {insight.action}
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
            
            {(!dashboardSummary?.insights || dashboardSummary.insights.length === 0) && (
              <div className="text-center py-8 text-surface-400">
                No new insights at this time
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Senders */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4">
          Top Senders This {period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month'}
        </h2>
        
        <div className="grid grid-cols-5 gap-4">
          {dashboardSummary?.topSenders.slice(0, 5).map((sender, i) => (
            <motion.div
              key={sender.email}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-4 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 
                transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br 
                from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <span className="text-lg font-medium text-primary-400">
                  {sender.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-surface-200 truncate">
                {sender.name}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {sender.count} emails
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

