import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron';
import path from 'path';
import { DatabaseService } from './services/database';
import { EmailProviderManager } from './services/providers/provider-manager';
import { EmailClassifier } from './services/classifier';
import { RulesEngine } from './services/rules-engine';
import { AnalyticsEngine } from './services/analytics';
import { CleanupService } from './services/cleanup';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let providerManager: EmailProviderManager;
let classifier: EmailClassifier;
let rulesEngine: RulesEngine;
let analyticsEngine: AnalyticsEngine;
let cleanupService: CleanupService;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeServices(): Promise<void> {
  const userDataPath = app.getPath('userData');
  
  // Initialize database
  db = new DatabaseService(path.join(userDataPath, 'cmail.db'));
  await db.initialize();
  
  // Initialize email classifier (local NLP)
  classifier = new EmailClassifier();
  await classifier.initialize();
  
  // Initialize provider manager
  providerManager = new EmailProviderManager(db);
  
  // Initialize rules engine
  rulesEngine = new RulesEngine(db, providerManager);
  
  // Initialize analytics engine
  analyticsEngine = new AnalyticsEngine(db);
  
  // Initialize cleanup service
  cleanupService = new CleanupService(db, providerManager);
}

// IPC Handlers - Window Controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

// IPC Handlers - Email Accounts
ipcMain.handle('accounts:list', async () => {
  return db.getAccounts();
});

ipcMain.handle('accounts:add', async (_, provider: string, config: any) => {
  return providerManager.addAccount(provider, config);
});

ipcMain.handle('accounts:remove', async (_, accountId: string) => {
  return providerManager.removeAccount(accountId);
});

ipcMain.handle('accounts:sync', async (_, accountId?: string) => {
  const accounts = accountId 
    ? [await db.getAccount(accountId)]
    : await db.getAccounts();
  
  for (const account of accounts) {
    if (account) {
      mainWindow?.webContents.send('sync:progress', { accountId: account.id, status: 'syncing' });
      await providerManager.syncEmails(account.id);
      mainWindow?.webContents.send('sync:progress', { accountId: account.id, status: 'classifying' });
      await classifyNewEmails(account.id);
      mainWindow?.webContents.send('sync:progress', { accountId: account.id, status: 'complete' });
    }
  }
  return { success: true };
});

// IPC Handlers - OAuth
ipcMain.handle('oauth:gmail', async () => {
  return providerManager.authenticateGmail();
});

ipcMain.handle('oauth:outlook', async () => {
  return providerManager.authenticateOutlook();
});

// IPC Handlers - Emails
ipcMain.handle('emails:list', async (_, options: {
  accountId?: string;
  category?: string;
  folder?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return db.getEmails(options);
});

ipcMain.handle('emails:get', async (_, emailId: string) => {
  return db.getEmail(emailId);
});

ipcMain.handle('emails:updateCategory', async (_, emailId: string, category: string) => {
  await db.updateEmailCategory(emailId, category);
  return { success: true };
});

ipcMain.handle('emails:markRead', async (_, emailIds: string[], read: boolean) => {
  await db.markEmailsRead(emailIds, read);
  return { success: true };
});

ipcMain.handle('emails:archive', async (_, emailIds: string[]) => {
  for (const emailId of emailIds) {
    const email = await db.getEmail(emailId);
    if (email) {
      await providerManager.archiveEmail(email.accountId, emailId);
    }
  }
  return { success: true };
});

ipcMain.handle('emails:delete', async (_, emailIds: string[]) => {
  for (const emailId of emailIds) {
    const email = await db.getEmail(emailId);
    if (email) {
      await providerManager.deleteEmail(email.accountId, emailId);
    }
  }
  return { success: true };
});

// IPC Handlers - Categories & Classification
ipcMain.handle('categories:list', async () => {
  return db.getCategories();
});

ipcMain.handle('categories:stats', async (_, options: { accountId?: string; period?: string }) => {
  return analyticsEngine.getCategoryStats(options);
});

// IPC Handlers - Dashboard & Analytics
ipcMain.handle('dashboard:summary', async (_, options: { period: 'day' | 'week' | 'month' }) => {
  return analyticsEngine.getDashboardSummary(options);
});

ipcMain.handle('analytics:timeOfDay', async (_, accountId?: string) => {
  return analyticsEngine.getTimeOfDayAnalysis(accountId);
});

ipcMain.handle('analytics:senderImportance', async (_, accountId?: string) => {
  return analyticsEngine.getSenderImportanceScores(accountId);
});

ipcMain.handle('analytics:topicTrends', async (_, options: { period: string; accountId?: string }) => {
  return analyticsEngine.getTopicTrends(options);
});

// IPC Handlers - Cleanup
ipcMain.handle('cleanup:suggestions', async (_, accountId?: string) => {
  return cleanupService.getSuggestions(accountId);
});

ipcMain.handle('cleanup:execute', async (_, action: {
  type: string;
  emailIds?: string[];
  options?: any;
}) => {
  return cleanupService.executeAction(action);
});

ipcMain.handle('cleanup:unsubscribe', async (_, emailIds: string[]) => {
  return cleanupService.bulkUnsubscribe(emailIds);
});

ipcMain.handle('cleanup:findDuplicates', async (_, accountId?: string) => {
  return cleanupService.findDuplicates(accountId);
});

ipcMain.handle('cleanup:findLargeAttachments', async (_, options: { minSize?: number; accountId?: string }) => {
  return cleanupService.findLargeAttachments(options);
});

// IPC Handlers - Rules
ipcMain.handle('rules:list', async () => {
  return db.getRules();
});

ipcMain.handle('rules:create', async (_, rule: any) => {
  return rulesEngine.createRule(rule);
});

ipcMain.handle('rules:update', async (_, ruleId: string, updates: any) => {
  return rulesEngine.updateRule(ruleId, updates);
});

ipcMain.handle('rules:delete', async (_, ruleId: string) => {
  return rulesEngine.deleteRule(ruleId);
});

ipcMain.handle('rules:suggestions', async () => {
  return rulesEngine.getSuggestions();
});

ipcMain.handle('rules:test', async (_, ruleId: string) => {
  return rulesEngine.testRule(ruleId);
});

// IPC Handlers - Export/Import
ipcMain.handle('export:rules', async () => {
  return db.exportRules();
});

ipcMain.handle('import:rules', async (_, data: string) => {
  return db.importRules(data);
});

ipcMain.handle('export:data', async (_, options: { format: 'json' | 'csv'; type: string }) => {
  return db.exportData(options);
});

// IPC Handlers - Settings
ipcMain.handle('settings:get', async () => {
  return db.getSettings();
});

ipcMain.handle('settings:update', async (_, settings: any) => {
  return db.updateSettings(settings);
});

// IPC Handlers - Notifications
ipcMain.handle('notification:show', async (_, options: { title: string; body: string }) => {
  new Notification(options).show();
});

// Helper function to classify new emails
async function classifyNewEmails(accountId: string): Promise<void> {
  const unclassifiedEmails = await db.getUnclassifiedEmails(accountId);
  
  for (const email of unclassifiedEmails) {
    const classification = await classifier.classify(email);
    await db.updateEmailCategory(email.id, classification.category);
    await db.updateEmailMetadata(email.id, {
      importance: classification.importance,
      keywords: classification.keywords,
    });
  }
}

// Show critical email notifications
async function checkCriticalEmails(): Promise<void> {
  const settings = await db.getSettings();
  if (!settings.notifications?.critical) return;
  
  const criticalEmails = await db.getCriticalEmails();
  for (const email of criticalEmails) {
    new Notification({
      title: 'Critical Email',
      body: `From: ${email.from}\n${email.subject}`,
    }).show();
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  // Periodic sync (every 5 minutes)
  setInterval(async () => {
    const settings = await db.getSettings();
    if (settings.autoSync) {
      await providerManager.syncAllAccounts();
      await checkCriticalEmails();
    }
  }, 5 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  db?.close();
});

