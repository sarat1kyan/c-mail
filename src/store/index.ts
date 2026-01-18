import { create } from 'zustand';

// Type definitions
export interface Account {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'imap';
  name?: string;
  avatar?: string;
  lastSync?: string;
}

export interface Email {
  id: string;
  accountId: string;
  messageId: string;
  threadId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
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

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  hitCount?: number;
  lastHit?: string;
  createdAt: string;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

export interface RuleAction {
  type: string;
  value?: string;
}

export interface CleanupSuggestion {
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

export interface DashboardSummary {
  totalEmails: number;
  unreadCount: number;
  todayCount: number;
  weekCount: number;
  categories: CategoryStats[];
  criticalEmails: Email[];
  trends: { received: number[]; labels: string[] };
  topSenders: SenderStats[];
  insights: Insight[];
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  trend: number;
  icon: string;
  color: string;
}

export interface SenderStats {
  email: string;
  name: string;
  count: number;
  lastEmail: string;
}

export interface Insight {
  type: 'info' | 'warning' | 'success';
  title: string;
  description: string;
  action?: string;
}

export interface Settings {
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

// Get electron API
const electron = (window as any).electron;

interface AppState {
  // Data
  accounts: Account[];
  emails: Email[];
  categories: Category[];
  rules: Rule[];
  settings: Settings | null;
  dashboardSummary: DashboardSummary | null;
  cleanupSuggestions: CleanupSuggestion[];
  
  // UI State
  selectedAccountId: string | null;
  selectedEmailId: string | null;
  selectedCategory: string | null;
  isSyncing: boolean;
  syncProgress: { [key: string]: string };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAccounts: () => Promise<void>;
  addAccount: (provider: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  syncAccounts: (accountId?: string) => Promise<void>;
  
  loadEmails: (options?: { category?: string; search?: string }) => Promise<void>;
  selectEmail: (emailId: string | null) => void;
  markEmailsRead: (emailIds: string[], read: boolean) => Promise<void>;
  archiveEmails: (emailIds: string[]) => Promise<void>;
  deleteEmails: (emailIds: string[]) => Promise<void>;
  updateEmailCategory: (emailId: string, category: string) => Promise<void>;
  
  loadCategories: () => Promise<void>;
  selectCategory: (category: string | null) => void;
  
  loadDashboard: (period?: 'day' | 'week' | 'month') => Promise<void>;
  
  loadCleanupSuggestions: () => Promise<void>;
  executeCleanup: (action: { type: string; emailIds?: string[] }) => Promise<void>;
  
  loadRules: () => Promise<void>;
  createRule: (rule: Partial<Rule>) => Promise<void>;
  updateRule: (ruleId: string, updates: Partial<Rule>) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  accounts: [],
  emails: [],
  categories: [],
  rules: [],
  settings: null,
  dashboardSummary: null,
  cleanupSuggestions: [],
  
  selectedAccountId: null,
  selectedEmailId: null,
  selectedCategory: null,
  isSyncing: false,
  syncProgress: {},
  isLoading: false,
  error: null,
  
  // Account actions
  loadAccounts: async () => {
    if (!electron) return;
    try {
      const accounts = await electron.accounts.list();
      set({ accounts });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  addAccount: async (provider: string) => {
    if (!electron) return;
    try {
      let result;
      if (provider === 'gmail') {
        result = await electron.oauth.gmail();
      } else if (provider === 'outlook') {
        result = await electron.oauth.outlook();
      }
      
      if (result?.success) {
        await get().loadAccounts();
        await get().syncAccounts(result.account?.id);
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  removeAccount: async (accountId: string) => {
    if (!electron) return;
    try {
      await electron.accounts.remove(accountId);
      await get().loadAccounts();
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  syncAccounts: async (accountId?: string) => {
    if (!electron) return;
    set({ isSyncing: true });
    try {
      await electron.accounts.sync(accountId);
      await get().loadEmails();
      await get().loadCategories();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isSyncing: false });
    }
  },
  
  // Email actions
  loadEmails: async (options = {}) => {
    if (!electron) return;
    set({ isLoading: true });
    try {
      const emails = await electron.emails.list({
        ...options,
        accountId: get().selectedAccountId || undefined,
        limit: 100,
      });
      set({ emails });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  selectEmail: (emailId) => {
    set({ selectedEmailId: emailId });
  },
  
  markEmailsRead: async (emailIds, read) => {
    if (!electron) return;
    try {
      await electron.emails.markRead(emailIds, read);
      set({
        emails: get().emails.map(e => 
          emailIds.includes(e.id) ? { ...e, isRead: read } : e
        ),
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  archiveEmails: async (emailIds) => {
    if (!electron) return;
    try {
      await electron.emails.archive(emailIds);
      set({
        emails: get().emails.filter(e => !emailIds.includes(e.id)),
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  deleteEmails: async (emailIds) => {
    if (!electron) return;
    try {
      await electron.emails.delete(emailIds);
      set({
        emails: get().emails.filter(e => !emailIds.includes(e.id)),
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  updateEmailCategory: async (emailId, category) => {
    if (!electron) return;
    try {
      await electron.emails.updateCategory(emailId, category);
      set({
        emails: get().emails.map(e => 
          e.id === emailId ? { ...e, category } : e
        ),
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  // Category actions
  loadCategories: async () => {
    if (!electron) return;
    try {
      const categories = await electron.categories.list();
      set({ categories });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  selectCategory: (category) => {
    set({ selectedCategory: category });
    get().loadEmails({ category: category || undefined });
  },
  
  // Dashboard actions
  loadDashboard: async (period = 'week') => {
    if (!electron) return;
    set({ isLoading: true });
    try {
      const summary = await electron.dashboard.summary({ period });
      set({ dashboardSummary: summary });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Cleanup actions
  loadCleanupSuggestions: async () => {
    if (!electron) return;
    try {
      const suggestions = await electron.cleanup.suggestions();
      set({ cleanupSuggestions: suggestions });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  executeCleanup: async (action) => {
    if (!electron) return;
    try {
      await electron.cleanup.execute(action);
      await get().loadCleanupSuggestions();
      await get().loadEmails();
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  // Rules actions
  loadRules: async () => {
    if (!electron) return;
    try {
      const rules = await electron.rules.list();
      set({ rules });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  createRule: async (rule) => {
    if (!electron) return;
    try {
      await electron.rules.create(rule);
      await get().loadRules();
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  updateRule: async (ruleId, updates) => {
    if (!electron) return;
    try {
      await electron.rules.update(ruleId, updates);
      await get().loadRules();
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  deleteRule: async (ruleId) => {
    if (!electron) return;
    try {
      await electron.rules.delete(ruleId);
      await get().loadRules();
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  // Settings actions
  loadSettings: async () => {
    if (!electron) return;
    try {
      const settings = await electron.settings.get();
      set({ settings });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  updateSettings: async (updates) => {
    if (!electron) return;
    try {
      const settings = await electron.settings.update(updates);
      set({ settings });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  setError: (error) => set({ error }),
}));

