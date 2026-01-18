export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  
  accounts: {
    list: () => Promise<Account[]>;
    add: (provider: string, config: any) => Promise<Account>;
    remove: (accountId: string) => Promise<void>;
    sync: (accountId?: string) => Promise<{ success: boolean }>;
  };
  
  oauth: {
    gmail: () => Promise<{ success: boolean; account?: Account }>;
    outlook: () => Promise<{ success: boolean; account?: Account }>;
  };
  
  emails: {
    list: (options: EmailListOptions) => Promise<Email[]>;
    get: (emailId: string) => Promise<Email>;
    updateCategory: (emailId: string, category: string) => Promise<void>;
    markRead: (emailIds: string[], read: boolean) => Promise<void>;
    archive: (emailIds: string[]) => Promise<void>;
    delete: (emailIds: string[]) => Promise<void>;
  };
  
  categories: {
    list: () => Promise<Category[]>;
    stats: (options: { accountId?: string; period?: string }) => Promise<CategoryStats[]>;
  };
  
  dashboard: {
    summary: (options: { period: 'day' | 'week' | 'month' }) => Promise<DashboardSummary>;
  };
  
  analytics: {
    timeOfDay: (accountId?: string) => Promise<TimeOfDayData>;
    senderImportance: (accountId?: string) => Promise<SenderScore[]>;
    topicTrends: (options: { period: string; accountId?: string }) => Promise<TopicTrend[]>;
  };
  
  cleanup: {
    suggestions: (accountId?: string) => Promise<CleanupSuggestion[]>;
    execute: (action: CleanupAction) => Promise<void>;
    unsubscribe: (emailIds: string[]) => Promise<void>;
    findDuplicates: (accountId?: string) => Promise<DuplicateGroup[]>;
    findLargeAttachments: (options: { minSize?: number; accountId?: string }) => Promise<Email[]>;
  };
  
  rules: {
    list: () => Promise<Rule[]>;
    create: (rule: CreateRuleInput) => Promise<Rule>;
    update: (ruleId: string, updates: Partial<Rule>) => Promise<Rule>;
    delete: (ruleId: string) => Promise<void>;
    suggestions: () => Promise<RuleSuggestion[]>;
    test: (ruleId: string) => Promise<RuleTestResult>;
  };
  
  export: {
    rules: () => Promise<string>;
    data: (options: { format: 'json' | 'csv'; type: string }) => Promise<string>;
  };
  
  import: {
    rules: (data: string) => Promise<void>;
  };
  
  settings: {
    get: () => Promise<Settings>;
    update: (settings: Partial<Settings>) => Promise<Settings>;
  };
  
  notification: {
    show: (options: { title: string; body: string }) => Promise<void>;
  };
  
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
}

interface Account {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'imap';
  name?: string;
  avatar?: string;
  lastSync?: string;
}

interface Email {
  id: string;
  accountId: string;
  messageId: string;
  threadId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  category: string;
  importance: number;
  attachments?: Attachment[];
  hasUnsubscribe?: boolean;
  unsubscribeLink?: string;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface EmailListOptions {
  accountId?: string;
  category?: string;
  folder?: string;
  search?: string;
  limit?: number;
  offset?: number;
  isRead?: boolean;
  isStarred?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  trend: number;
  icon: string;
  color: string;
}

interface DashboardSummary {
  totalEmails: number;
  unreadCount: number;
  todayCount: number;
  weekCount: number;
  categories: CategoryStats[];
  criticalEmails: Email[];
  recentActivity: ActivityItem[];
  trends: TrendData;
  topSenders: SenderStats[];
  insights: Insight[];
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
}

interface TrendData {
  received: number[];
  labels: string[];
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

interface CleanupSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  emailIds: string[];
  estimatedSpace?: number;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  action: string;
}

interface CleanupAction {
  type: string;
  emailIds?: string[];
  options?: any;
}

interface DuplicateGroup {
  hash: string;
  emails: Email[];
  subject: string;
  from: string;
}

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  provider?: string;
  priority: number;
  hitCount: number;
  lastHit?: string;
  createdAt: string;
  updatedAt: string;
}

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface RuleAction {
  type: string;
  value?: string;
}

interface CreateRuleInput {
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface RuleSuggestion {
  id: string;
  rule: CreateRuleInput;
  confidence: number;
  reason: string;
  sampleEmails: Email[];
}

interface RuleTestResult {
  matchingEmails: Email[];
  totalMatches: number;
}

interface Settings {
  theme: 'dark' | 'light' | 'system';
  autoSync: boolean;
  syncInterval: number;
  notifications: {
    enabled: boolean;
    critical: boolean;
    sound: boolean;
  };
  cleanup: {
    autoArchiveAfterDays: number;
    deleteSpamAfterDays: number;
  };
  privacy: {
    localProcessingOnly: boolean;
    encryptDatabase: boolean;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

