import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for exposed API
export interface ElectronAPI {
  // Window controls
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  
  // Account management
  accounts: {
    list: () => Promise<Account[]>;
    add: (provider: string, config: any) => Promise<Account>;
    remove: (accountId: string) => Promise<void>;
    sync: (accountId?: string) => Promise<{ success: boolean }>;
  };
  
  // OAuth
  oauth: {
    gmail: () => Promise<{ success: boolean; account?: Account }>;
    outlook: () => Promise<{ success: boolean; account?: Account }>;
  };
  
  // Email operations
  emails: {
    list: (options: EmailListOptions) => Promise<Email[]>;
    get: (emailId: string) => Promise<Email>;
    updateCategory: (emailId: string, category: string) => Promise<void>;
    markRead: (emailIds: string[], read: boolean) => Promise<void>;
    archive: (emailIds: string[]) => Promise<void>;
    delete: (emailIds: string[]) => Promise<void>;
  };
  
  // Categories
  categories: {
    list: () => Promise<Category[]>;
    stats: (options: { accountId?: string; period?: string }) => Promise<CategoryStats[]>;
  };
  
  // Dashboard & Analytics
  dashboard: {
    summary: (options: { period: 'day' | 'week' | 'month' }) => Promise<DashboardSummary>;
  };
  
  analytics: {
    timeOfDay: (accountId?: string) => Promise<TimeOfDayData>;
    senderImportance: (accountId?: string) => Promise<SenderScore[]>;
    topicTrends: (options: { period: string; accountId?: string }) => Promise<TopicTrend[]>;
  };
  
  // Cleanup
  cleanup: {
    suggestions: (accountId?: string) => Promise<CleanupSuggestion[]>;
    execute: (action: CleanupAction) => Promise<void>;
    unsubscribe: (emailIds: string[]) => Promise<void>;
    findDuplicates: (accountId?: string) => Promise<DuplicateGroup[]>;
    findLargeAttachments: (options: { minSize?: number; accountId?: string }) => Promise<Email[]>;
  };
  
  // Rules
  rules: {
    list: () => Promise<Rule[]>;
    create: (rule: CreateRuleInput) => Promise<Rule>;
    update: (ruleId: string, updates: Partial<Rule>) => Promise<Rule>;
    delete: (ruleId: string) => Promise<void>;
    suggestions: () => Promise<RuleSuggestion[]>;
    test: (ruleId: string) => Promise<RuleTestResult>;
  };
  
  // Export/Import
  export: {
    rules: () => Promise<string>;
    data: (options: { format: 'json' | 'csv'; type: string }) => Promise<string>;
  };
  
  import: {
    rules: (data: string) => Promise<void>;
  };
  
  // Settings
  settings: {
    get: () => Promise<Settings>;
    update: (settings: Partial<Settings>) => Promise<Settings>;
  };
  
  // Notifications
  notification: {
    show: (options: { title: string; body: string }) => Promise<void>;
  };
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  
  // Account management
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (provider: string, config: any) => ipcRenderer.invoke('accounts:add', provider, config),
    remove: (accountId: string) => ipcRenderer.invoke('accounts:remove', accountId),
    sync: (accountId?: string) => ipcRenderer.invoke('accounts:sync', accountId),
  },
  
  // OAuth
  oauth: {
    gmail: () => ipcRenderer.invoke('oauth:gmail'),
    outlook: () => ipcRenderer.invoke('oauth:outlook'),
  },
  
  // Email operations
  emails: {
    list: (options: any) => ipcRenderer.invoke('emails:list', options),
    get: (emailId: string) => ipcRenderer.invoke('emails:get', emailId),
    updateCategory: (emailId: string, category: string) => 
      ipcRenderer.invoke('emails:updateCategory', emailId, category),
    markRead: (emailIds: string[], read: boolean) => 
      ipcRenderer.invoke('emails:markRead', emailIds, read),
    archive: (emailIds: string[]) => ipcRenderer.invoke('emails:archive', emailIds),
    delete: (emailIds: string[]) => ipcRenderer.invoke('emails:delete', emailIds),
  },
  
  // Categories
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    stats: (options: any) => ipcRenderer.invoke('categories:stats', options),
  },
  
  // Dashboard & Analytics
  dashboard: {
    summary: (options: any) => ipcRenderer.invoke('dashboard:summary', options),
  },
  
  analytics: {
    timeOfDay: (accountId?: string) => ipcRenderer.invoke('analytics:timeOfDay', accountId),
    senderImportance: (accountId?: string) => ipcRenderer.invoke('analytics:senderImportance', accountId),
    topicTrends: (options: any) => ipcRenderer.invoke('analytics:topicTrends', options),
  },
  
  // Cleanup
  cleanup: {
    suggestions: (accountId?: string) => ipcRenderer.invoke('cleanup:suggestions', accountId),
    execute: (action: any) => ipcRenderer.invoke('cleanup:execute', action),
    unsubscribe: (emailIds: string[]) => ipcRenderer.invoke('cleanup:unsubscribe', emailIds),
    findDuplicates: (accountId?: string) => ipcRenderer.invoke('cleanup:findDuplicates', accountId),
    findLargeAttachments: (options: any) => ipcRenderer.invoke('cleanup:findLargeAttachments', options),
  },
  
  // Rules
  rules: {
    list: () => ipcRenderer.invoke('rules:list'),
    create: (rule: any) => ipcRenderer.invoke('rules:create', rule),
    update: (ruleId: string, updates: any) => ipcRenderer.invoke('rules:update', ruleId, updates),
    delete: (ruleId: string) => ipcRenderer.invoke('rules:delete', ruleId),
    suggestions: () => ipcRenderer.invoke('rules:suggestions'),
    test: (ruleId: string) => ipcRenderer.invoke('rules:test', ruleId),
  },
  
  // Export/Import
  export: {
    rules: () => ipcRenderer.invoke('export:rules'),
    data: (options: any) => ipcRenderer.invoke('export:data', options),
  },
  
  import: {
    rules: (data: string) => ipcRenderer.invoke('import:rules', data),
  },
  
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },
  
  // Notifications
  notification: {
    show: (options: any) => ipcRenderer.invoke('notification:show', options),
  },
  
  // Event listeners with cleanup
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
} as ElectronAPI);

// Type declarations for the exposed API
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
}

interface DashboardSummary {
  totalEmails: number;
  unreadCount: number;
  categories: CategoryStats[];
  criticalEmails: Email[];
  recentActivity: ActivityItem[];
  trends: TrendData;
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
}

interface TrendData {
  received: number[];
  sent: number[];
  labels: string[];
}

interface TimeOfDayData {
  hours: { hour: number; count: number }[];
  bestResponseTime: string;
}

interface SenderScore {
  email: string;
  name: string;
  score: number;
  emailCount: number;
  responseRate: number;
}

interface TopicTrend {
  topic: string;
  count: number;
  trend: number;
}

interface CleanupSuggestion {
  id: string;
  type: 'duplicate' | 'inactive_subscription' | 'spam' | 'large_attachment' | 'old_transactional';
  title: string;
  description: string;
  emailIds: string[];
  estimatedSpace?: number;
  priority: 'low' | 'medium' | 'high';
}

interface CleanupAction {
  type: string;
  emailIds?: string[];
  options?: any;
}

interface DuplicateGroup {
  hash: string;
  emails: Email[];
}

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'date' | 'hasAttachment';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'before' | 'after';
  value: string;
}

interface RuleAction {
  type: 'move' | 'label' | 'archive' | 'delete' | 'markRead' | 'star' | 'forward';
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

