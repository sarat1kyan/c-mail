import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';

export interface Email {
  id: string;
  accountId: string;
  messageId: string;
  threadId?: string;
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  isRead: number;
  isStarred: number;
  labels: string;
  category: string;
  importance: number;
  attachments?: string;
  size?: number;
  headers?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  email: string;
  provider: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  lastSync?: string;
  createdAt: string;
}

export class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private saveInterval: NodeJS.Timeout | null = null;
  
  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }
  
  async initialize(): Promise<void> {
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Check if database file exists
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new SQL.Database();
    }
    
    // Create tables
    this.db.run(`
      -- Accounts table
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        name TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TEXT,
        last_sync TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      -- Emails table
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        thread_id TEXT,
        from_address TEXT NOT NULL,
        from_name TEXT,
        to_addresses TEXT NOT NULL,
        cc_addresses TEXT,
        bcc_addresses TEXT,
        subject TEXT,
        snippet TEXT,
        body TEXT,
        body_html TEXT,
        date TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        labels TEXT DEFAULT '[]',
        category TEXT DEFAULT 'uncategorized',
        importance REAL DEFAULT 0.5,
        keywords TEXT DEFAULT '[]',
        attachments TEXT DEFAULT '[]',
        size INTEGER DEFAULT 0,
        headers TEXT,
        unsubscribe_link TEXT,
        has_unsubscribe INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        UNIQUE(account_id, message_id)
      );
      
      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT,
        description TEXT,
        keywords TEXT DEFAULT '[]',
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      -- Rules table
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        provider TEXT,
        priority INTEGER DEFAULT 0,
        hit_count INTEGER DEFAULT 0,
        last_hit TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      -- Analytics events table
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        account_id TEXT,
        email_id TEXT,
        data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      -- Cleanup suggestions cache
      CREATE TABLE IF NOT EXISTS cleanup_cache (
        id TEXT PRIMARY KEY,
        suggestion_type TEXT NOT NULL,
        email_ids TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
      );
    `);
    
    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read)`);
    
    // Insert default categories
    await this.initializeCategories();
    
    // Insert default settings
    await this.initializeSettings();
    
    // Save database periodically
    this.saveInterval = setInterval(() => this.save(), 30000);
    
    // Initial save
    this.save();
  }
  
  private save(): void {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }
  
  private async initializeCategories(): Promise<void> {
    const defaultCategories = [
      { id: 'financial', name: 'Financial', icon: 'landmark', color: '#10b981', keywords: ['bank', 'credit', 'investment', 'statement', 'transaction'] },
      { id: 'hr', name: 'HR/Recruitment', icon: 'briefcase', color: '#8b5cf6', keywords: ['job', 'offer', 'application', 'interview', 'hr'] },
      { id: 'marketing', name: 'Marketing/Ads', icon: 'megaphone', color: '#f59e0b', keywords: ['sale', 'discount', 'promotion', 'newsletter', 'unsubscribe'] },
      { id: 'important', name: 'Important', icon: 'star', color: '#ef4444', keywords: ['urgent', 'important', 'action required', 'deadline'] },
      { id: 'social', name: 'Social', icon: 'users', color: '#06b6d4', keywords: ['linkedin', 'facebook', 'twitter', 'notification'] },
      { id: 'shopping', name: 'Shopping', icon: 'shopping-cart', color: '#ec4899', keywords: ['order', 'shipping', 'delivery', 'receipt', 'purchase'] },
      { id: 'travel', name: 'Travel', icon: 'plane', color: '#14b8a6', keywords: ['flight', 'booking', 'hotel', 'reservation', 'itinerary'] },
      { id: 'bills', name: 'Bills/Invoices', icon: 'file-text', color: '#f97316', keywords: ['invoice', 'bill', 'payment due', 'amount due'] },
      { id: 'uncategorized', name: 'Uncategorized', icon: 'inbox', color: '#64748b', keywords: [] },
    ];
    
    for (const cat of defaultCategories) {
      this.db?.run(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, keywords, is_system) VALUES (?, ?, ?, ?, ?, 1)`,
        [cat.id, cat.name, cat.icon, cat.color, JSON.stringify(cat.keywords)]
      );
    }
  }
  
  private async initializeSettings(): Promise<void> {
    const defaultSettings = {
      theme: 'dark',
      autoSync: true,
      syncInterval: 5,
      notifications: {
        enabled: true,
        critical: true,
        sound: true,
      },
      cleanup: {
        autoArchiveAfterDays: 365,
        deleteSpamAfterDays: 30,
      },
      privacy: {
        localProcessingOnly: true,
        encryptDatabase: false,
      },
    };
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      this.db?.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
        [key, JSON.stringify(value)]
      );
    }
  }
  
  private query<T>(sql: string, params: any[] = []): T[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }
  
  private queryOne<T>(sql: string, params: any[] = []): T | undefined {
    const results = this.query<T>(sql, params);
    return results[0];
  }
  
  private run(sql: string, params: any[] = []): void {
    if (!this.db) return;
    this.db.run(sql, params);
  }
  
  // Account methods
  getAccounts(): Account[] {
    return this.query<any>('SELECT * FROM accounts ORDER BY created_at').map(this.transformAccount);
  }
  
  getAccount(id: string): Account | undefined {
    const row = this.queryOne<any>('SELECT * FROM accounts WHERE id = ?', [id]);
    return row ? this.transformAccount(row) : undefined;
  }
  
  createAccount(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const id = nanoid();
    this.run(
      `INSERT INTO accounts (id, email, provider, name, access_token, refresh_token, token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, account.email, account.provider, account.name, account.accessToken, account.refreshToken, account.tokenExpiry]
    );
    this.save();
    return this.getAccount(id)!;
  }
  
  updateAccount(id: string, updates: Partial<Account>): void {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.accessToken !== undefined) {
      setClauses.push('access_token = ?');
      values.push(updates.accessToken);
    }
    if (updates.refreshToken !== undefined) {
      setClauses.push('refresh_token = ?');
      values.push(updates.refreshToken);
    }
    if (updates.tokenExpiry !== undefined) {
      setClauses.push('token_expiry = ?');
      values.push(updates.tokenExpiry);
    }
    if (updates.lastSync !== undefined) {
      setClauses.push('last_sync = ?');
      values.push(updates.lastSync);
    }
    
    if (setClauses.length > 0) {
      values.push(id);
      this.run(`UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`, values);
      this.save();
    }
  }
  
  deleteAccount(id: string): void {
    this.run('DELETE FROM accounts WHERE id = ?', [id]);
    this.save();
  }
  
  private transformAccount(row: any): Account {
    return {
      id: row.id,
      email: row.email,
      provider: row.provider,
      name: row.name,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry,
      lastSync: row.last_sync,
      createdAt: row.created_at,
    };
  }
  
  // Email methods
  getEmails(options: {
    accountId?: string;
    category?: string;
    folder?: string;
    search?: string;
    limit?: number;
    offset?: number;
    isRead?: boolean;
    isStarred?: boolean;
  } = {}): any[] {
    let sql = 'SELECT * FROM emails WHERE 1=1';
    const params: any[] = [];
    
    if (options.accountId) {
      sql += ' AND account_id = ?';
      params.push(options.accountId);
    }
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    
    if (options.isRead !== undefined) {
      sql += ' AND is_read = ?';
      params.push(options.isRead ? 1 : 0);
    }
    
    if (options.isStarred !== undefined) {
      sql += ' AND is_starred = ?';
      params.push(options.isStarred ? 1 : 0);
    }
    
    if (options.search) {
      sql += ' AND (subject LIKE ? OR snippet LIKE ? OR from_address LIKE ? OR from_name LIKE ?)';
      const searchParam = `%${options.search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    sql += ' ORDER BY date DESC';
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
    
    return this.query<any>(sql, params).map(this.transformEmail);
  }
  
  getEmail(id: string): any {
    const row = this.queryOne<any>('SELECT * FROM emails WHERE id = ?', [id]);
    return row ? this.transformEmail(row) : null;
  }
  
  getUnclassifiedEmails(accountId: string): any[] {
    return this.query<any>(
      `SELECT * FROM emails WHERE account_id = ? AND category = 'uncategorized' ORDER BY date DESC`,
      [accountId]
    ).map(this.transformEmail);
  }
  
  getCriticalEmails(): any[] {
    return this.query<any>(
      `SELECT * FROM emails WHERE importance >= 0.8 AND is_read = 0 ORDER BY date DESC LIMIT 10`
    ).map(this.transformEmail);
  }
  
  saveEmail(email: any): void {
    this.run(`
      INSERT OR REPLACE INTO emails (
        id, account_id, message_id, thread_id, from_address, from_name,
        to_addresses, cc_addresses, bcc_addresses, subject, snippet, body,
        body_html, date, is_read, is_starred, labels, category, importance,
        attachments, size, headers, unsubscribe_link, has_unsubscribe, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      email.id || nanoid(),
      email.accountId,
      email.messageId,
      email.threadId,
      email.from,
      email.fromName,
      JSON.stringify(email.to),
      JSON.stringify(email.cc || []),
      JSON.stringify(email.bcc || []),
      email.subject,
      email.snippet,
      email.body,
      email.bodyHtml,
      email.date,
      email.isRead ? 1 : 0,
      email.isStarred ? 1 : 0,
      JSON.stringify(email.labels || []),
      email.category || 'uncategorized',
      email.importance || 0.5,
      JSON.stringify(email.attachments || []),
      email.size || 0,
      JSON.stringify(email.headers || {}),
      email.unsubscribeLink,
      email.hasUnsubscribe ? 1 : 0
    ]);
  }
  
  updateEmailCategory(id: string, category: string): void {
    this.run(
      `UPDATE emails SET category = ?, updated_at = datetime('now') WHERE id = ?`,
      [category, id]
    );
  }
  
  updateEmailMetadata(id: string, metadata: { importance?: number; keywords?: string[] }): void {
    if (metadata.importance !== undefined) {
      this.run(
        `UPDATE emails SET importance = ?, updated_at = datetime('now') WHERE id = ?`,
        [metadata.importance, id]
      );
    }
    if (metadata.keywords) {
      this.run(
        `UPDATE emails SET keywords = ?, updated_at = datetime('now') WHERE id = ?`,
        [JSON.stringify(metadata.keywords), id]
      );
    }
  }
  
  markEmailsRead(ids: string[], read: boolean): void {
    const placeholders = ids.map(() => '?').join(',');
    this.run(
      `UPDATE emails SET is_read = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
      [read ? 1 : 0, ...ids]
    );
  }
  
  deleteEmails(ids: string[]): void {
    const placeholders = ids.map(() => '?').join(',');
    this.run(`DELETE FROM emails WHERE id IN (${placeholders})`, ids);
  }
  
  private transformEmail(row: any): any {
    return {
      id: row.id,
      accountId: row.account_id,
      messageId: row.message_id,
      threadId: row.thread_id,
      from: row.from_address,
      fromName: row.from_name,
      to: JSON.parse(row.to_addresses || '[]'),
      cc: JSON.parse(row.cc_addresses || '[]'),
      bcc: JSON.parse(row.bcc_addresses || '[]'),
      subject: row.subject,
      snippet: row.snippet,
      body: row.body,
      bodyHtml: row.body_html,
      date: row.date,
      isRead: !!row.is_read,
      isStarred: !!row.is_starred,
      labels: JSON.parse(row.labels || '[]'),
      category: row.category,
      importance: row.importance,
      attachments: JSON.parse(row.attachments || '[]'),
      size: row.size,
      unsubscribeLink: row.unsubscribe_link,
      hasUnsubscribe: !!row.has_unsubscribe,
    };
  }
  
  // Category methods
  getCategories(): any[] {
    const categories = this.query<any>(`SELECT * FROM categories ORDER BY is_system DESC, name`);
    
    return categories.map(c => {
      const countResult = this.queryOne<any>(
        `SELECT COUNT(*) as count FROM emails WHERE category = ?`,
        [c.id]
      );
      return {
        ...c,
        count: countResult?.count || 0,
        keywords: JSON.parse(c.keywords || '[]'),
      };
    });
  }
  
  // Rules methods
  getRules(): any[] {
    return this.query<any>('SELECT * FROM rules ORDER BY priority DESC, created_at').map(r => ({
      ...r,
      enabled: !!r.enabled,
      conditions: JSON.parse(r.conditions),
      actions: JSON.parse(r.actions),
    }));
  }
  
  getRule(id: string): any {
    const row = this.queryOne<any>('SELECT * FROM rules WHERE id = ?', [id]);
    if (!row) return null;
    return {
      ...row,
      enabled: !!row.enabled,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
    };
  }
  
  saveRule(rule: any): any {
    const id = rule.id || nanoid();
    this.run(`
      INSERT OR REPLACE INTO rules (id, name, enabled, conditions, actions, provider, priority, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      id,
      rule.name,
      rule.enabled ? 1 : 0,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.provider,
      rule.priority || 0
    ]);
    this.save();
    return this.getRule(id);
  }
  
  deleteRule(id: string): void {
    this.run('DELETE FROM rules WHERE id = ?', [id]);
    this.save();
  }
  
  // Settings methods
  getSettings(): any {
    const rows = this.query<any>('SELECT key, value FROM settings');
    const settings: any = {};
    for (const row of rows) {
      settings[row.key] = JSON.parse(row.value);
    }
    return settings;
  }
  
  updateSettings(updates: any): any {
    for (const [key, value] of Object.entries(updates)) {
      this.run(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
        [key, JSON.stringify(value)]
      );
    }
    this.save();
    return this.getSettings();
  }
  
  // Export/Import
  exportRules(): string {
    const rules = this.getRules();
    return JSON.stringify(rules, null, 2);
  }
  
  importRules(data: string): void {
    const rules = JSON.parse(data);
    for (const rule of rules) {
      this.saveRule({ ...rule, id: nanoid() });
    }
  }
  
  exportData(options: { format: 'json' | 'csv'; type: string }): string {
    let data: any[];
    
    switch (options.type) {
      case 'emails':
        data = this.getEmails({ limit: 10000 });
        break;
      case 'rules':
        data = this.getRules();
        break;
      case 'categories':
        data = this.getCategories();
        break;
      default:
        data = [];
    }
    
    if (options.format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    // CSV format
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(h => JSON.stringify(item[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
  
  // Analytics
  getCategoryStats(options: { accountId?: string; period?: string } = {}): any[] {
    let sql = `
      SELECT 
        category,
        COUNT(*) as count
      FROM emails
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (options.accountId) {
      sql += ' AND account_id = ?';
      params.push(options.accountId);
    }
    
    if (options.period) {
      const days = options.period === 'week' ? 7 : options.period === 'month' ? 30 : 1;
      sql += ` AND date >= datetime('now', '-${days} days')`;
    }
    
    sql += ' GROUP BY category ORDER BY count DESC';
    
    const results = this.query<any>(sql, params);
    const total = results.reduce((sum, r) => sum + r.count, 0);
    
    return results.map(r => ({
      ...r,
      percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
    }));
  }
  
  close(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.save();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
