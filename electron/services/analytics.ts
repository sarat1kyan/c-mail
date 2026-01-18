import { DatabaseService } from './database';
import { format, subDays, startOfDay, endOfDay, parseISO, getHours } from 'date-fns';

interface DashboardSummary {
  totalEmails: number;
  unreadCount: number;
  todayCount: number;
  weekCount: number;
  categories: CategoryStats[];
  criticalEmails: any[];
  recentActivity: ActivityItem[];
  trends: {
    received: number[];
    labels: string[];
  };
  topSenders: SenderStats[];
  insights: Insight[];
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  trend: number;
  icon: string;
  color: string;
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
}

interface SenderStats {
  email: string;
  name: string;
  count: number;
  lastEmail: string;
}

interface Insight {
  type: 'info' | 'warning' | 'success';
  title: string;
  description: string;
  action?: string;
}

interface TimeOfDayData {
  hours: { hour: number; count: number; label: string }[];
  peakHour: number;
  bestResponseTime: string;
  quietHours: string;
}

interface SenderScore {
  email: string;
  name: string;
  score: number;
  emailCount: number;
  responseRate: number;
  avgResponseTime: string;
}

interface TopicTrend {
  topic: string;
  count: number;
  trend: number;
  samples: string[];
}

export class AnalyticsEngine {
  private db: DatabaseService;
  
  constructor(db: DatabaseService) {
    this.db = db;
  }
  
  async getDashboardSummary(options: { period: 'day' | 'week' | 'month' }): Promise<DashboardSummary> {
    const days = options.period === 'day' ? 1 : options.period === 'week' ? 7 : 30;
    const startDate = subDays(new Date(), days);
    
    // Get category stats with trends
    const categories = await this.getCategoryStats({ period: options.period });
    
    // Get critical/important emails
    const criticalEmails = this.db.getEmails({
      category: 'important',
      isRead: false,
      limit: 5,
    });
    
    // Calculate trends (emails per day for charts)
    const trends = this.calculateEmailTrends(days);
    
    // Get top senders
    const topSenders = this.getTopSenders(days);
    
    // Generate insights
    const insights = await this.generateInsights();
    
    // Recent activity (simplified)
    const recentActivity: ActivityItem[] = [
      { type: 'sync', description: 'Last sync completed', timestamp: new Date().toISOString() },
    ];
    
    // Get counts
    const allEmails = this.db.getEmails({});
    const unreadEmails = this.db.getEmails({ isRead: false });
    const todayStart = startOfDay(new Date()).toISOString();
    
    return {
      totalEmails: allEmails.length,
      unreadCount: unreadEmails.length,
      todayCount: allEmails.filter(e => e.date >= todayStart).length,
      weekCount: allEmails.filter(e => e.date >= subDays(new Date(), 7).toISOString()).length,
      categories,
      criticalEmails,
      recentActivity,
      trends,
      topSenders,
      insights,
    };
  }
  
  async getCategoryStats(options: { accountId?: string; period?: string } = {}): Promise<CategoryStats[]> {
    const dbStats = this.db.getCategoryStats(options);
    const categories = this.db.getCategories();
    
    // Map categories with their metadata
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Calculate previous period for trend comparison
    const days = options.period === 'week' ? 7 : options.period === 'month' ? 30 : 1;
    
    return dbStats.map(stat => {
      const category = categoryMap.get(stat.category);
      
      return {
        category: stat.category,
        count: stat.count,
        percentage: stat.percentage || 0,
        trend: Math.random() * 20 - 10, // Placeholder - would calculate actual trend
        icon: category?.icon || 'inbox',
        color: category?.color || '#64748b',
      };
    });
  }
  
  async getTimeOfDayAnalysis(accountId?: string): Promise<TimeOfDayData> {
    const emails = this.db.getEmails({ accountId, limit: 1000 });
    
    // Count emails by hour
    const hourCounts = new Array(24).fill(0);
    
    for (const email of emails) {
      try {
        const date = parseISO(email.date);
        const hour = getHours(date);
        hourCounts[hour]++;
      } catch {
        // Skip invalid dates
      }
    }
    
    // Find peak hour
    let peakHour = 0;
    let peakCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > peakCount) {
        peakCount = hourCounts[i];
        peakHour = i;
      }
    }
    
    // Format hours for display
    const hours = hourCounts.map((count, hour) => ({
      hour,
      count,
      label: format(new Date().setHours(hour, 0, 0, 0), 'ha'),
    }));
    
    // Find quiet hours (lowest activity period)
    const quietStart = hourCounts.indexOf(Math.min(...hourCounts));
    
    return {
      hours,
      peakHour,
      bestResponseTime: `${format(new Date().setHours(peakHour + 1, 0, 0, 0), 'h:mm a')} - ${format(new Date().setHours(peakHour + 2, 0, 0, 0), 'h:mm a')}`,
      quietHours: `${format(new Date().setHours(quietStart, 0, 0, 0), 'ha')} - ${format(new Date().setHours(quietStart + 4, 0, 0, 0), 'ha')}`,
    };
  }
  
  async getSenderImportanceScores(accountId?: string): Promise<SenderScore[]> {
    const emails = this.db.getEmails({ accountId, limit: 5000 });
    
    // Group by sender
    const senderData = new Map<string, {
      name: string;
      emails: any[];
      replied: number;
    }>();
    
    for (const email of emails) {
      const senderKey = email.from.toLowerCase();
      
      if (!senderData.has(senderKey)) {
        senderData.set(senderKey, {
          name: email.fromName || email.from,
          emails: [],
          replied: 0,
        });
      }
      
      senderData.get(senderKey)!.emails.push(email);
    }
    
    // Calculate scores
    const scores: SenderScore[] = [];
    
    for (const [email, data] of senderData) {
      const emailCount = data.emails.length;
      
      // Score based on:
      // - Frequency of emails
      // - Whether emails are read
      // - Category of emails (important > financial > others)
      let score = 0;
      let readCount = 0;
      
      for (const e of data.emails) {
        if (e.isRead) readCount++;
        
        switch (e.category) {
          case 'important':
            score += 10;
            break;
          case 'financial':
            score += 5;
            break;
          case 'bills':
            score += 4;
            break;
          case 'hr':
            score += 6;
            break;
          case 'marketing':
            score -= 2;
            break;
          default:
            score += 1;
        }
      }
      
      // Normalize score
      const normalizedScore = Math.min(100, Math.max(0, (score / emailCount) * 10));
      const responseRate = (readCount / emailCount) * 100;
      
      scores.push({
        email,
        name: data.name,
        score: Math.round(normalizedScore),
        emailCount,
        responseRate: Math.round(responseRate),
        avgResponseTime: '< 2 hours', // Placeholder
      });
    }
    
    // Sort by score and return top senders
    return scores
      .filter(s => s.emailCount >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
  
  async getTopicTrends(options: { period: string; accountId?: string }): Promise<TopicTrend[]> {
    const emails = this.db.getEmails({ accountId: options.accountId, limit: 500 });
    
    // Simple topic extraction using common words
    const topicCounts = new Map<string, { count: number; samples: string[] }>();
    
    // Common words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'your', 'my', 'his', 'her', 'its', 'our', 'their', 're', 'fwd', 'fw',
    ]);
    
    for (const email of emails) {
      const words = (email.subject || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
      
      for (const word of words) {
        if (!topicCounts.has(word)) {
          topicCounts.set(word, { count: 0, samples: [] });
        }
        const topic = topicCounts.get(word)!;
        topic.count++;
        if (topic.samples.length < 3) {
          topic.samples.push(email.subject);
        }
      }
    }
    
    // Sort by count and return top topics
    return Array.from(topicCounts.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        trend: Math.random() * 40 - 20, // Placeholder
        samples: data.samples,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }
  
  private calculateEmailTrends(days: number): { received: number[]; labels: string[] } {
    const received: number[] = [];
    const labels: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();
      
      const dayEmails = this.db.getEmails({}).filter(
        e => e.date >= dayStart && e.date <= dayEnd
      );
      
      received.push(dayEmails.length);
      labels.push(format(date, days > 7 ? 'MMM d' : 'EEE'));
    }
    
    return { received, labels };
  }
  
  private getTopSenders(days: number): SenderStats[] {
    const startDate = subDays(new Date(), days).toISOString();
    const emails = this.db.getEmails({}).filter(e => e.date >= startDate);
    
    const senderCounts = new Map<string, { name: string; count: number; lastEmail: string }>();
    
    for (const email of emails) {
      const senderKey = email.from.toLowerCase();
      
      if (!senderCounts.has(senderKey)) {
        senderCounts.set(senderKey, {
          name: email.fromName || email.from,
          count: 0,
          lastEmail: email.date,
        });
      }
      
      const sender = senderCounts.get(senderKey)!;
      sender.count++;
      if (email.date > sender.lastEmail) {
        sender.lastEmail = email.date;
      }
    }
    
    return Array.from(senderCounts.entries())
      .map(([email, data]) => ({
        email,
        name: data.name,
        count: data.count,
        lastEmail: data.lastEmail,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // Check for unread important emails
    const unreadImportant = this.db.getEmails({
      category: 'important',
      isRead: false,
    });
    
    if (unreadImportant.length > 0) {
      insights.push({
        type: 'warning',
        title: `${unreadImportant.length} important emails need attention`,
        description: 'You have unread emails marked as important.',
        action: 'View important emails',
      });
    }
    
    // Check for high marketing volume
    const categoryStats = this.db.getCategoryStats({ period: 'week' });
    const marketingStats = categoryStats.find(c => c.category === 'marketing');
    
    if (marketingStats && marketingStats.percentage > 30) {
      insights.push({
        type: 'info',
        title: 'High volume of promotional emails',
        description: `${Math.round(marketingStats.percentage)}% of your emails are marketing. Consider using cleanup tools.`,
        action: 'Review cleanup suggestions',
      });
    }
    
    // Positive insight
    const totalEmails = this.db.getEmails({}).length;
    const readEmails = this.db.getEmails({ isRead: true }).length;
    const readPercentage = totalEmails > 0 ? (readEmails / totalEmails) * 100 : 0;
    
    if (readPercentage > 80) {
      insights.push({
        type: 'success',
        title: 'Great inbox management!',
        description: `You've read ${Math.round(readPercentage)}% of your emails. Keep it up!`,
      });
    }
    
    return insights;
  }
}

