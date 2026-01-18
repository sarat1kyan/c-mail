import { BrowserWindow, shell } from 'electron';
import { DatabaseService } from '../database';
import { GmailProvider } from './gmail';
import { OutlookProvider } from './outlook';
import { ImapProvider } from './imap';

export interface EmailProvider {
  authenticate(): Promise<{ success: boolean; account?: any; error?: string }>;
  syncEmails(accountId: string): Promise<void>;
  archiveEmail(emailId: string): Promise<void>;
  deleteEmail(emailId: string): Promise<void>;
  moveEmail(emailId: string, folder: string): Promise<void>;
  markRead(emailId: string, read: boolean): Promise<void>;
  getUnsubscribeLink(emailId: string): Promise<string | null>;
}

export class EmailProviderManager {
  private db: DatabaseService;
  private providers: Map<string, EmailProvider> = new Map();
  
  constructor(db: DatabaseService) {
    this.db = db;
  }
  
  async addAccount(provider: string, config: any): Promise<any> {
    let emailProvider: EmailProvider;
    
    switch (provider) {
      case 'gmail':
        emailProvider = new GmailProvider(this.db, config);
        break;
      case 'outlook':
        emailProvider = new OutlookProvider(this.db, config);
        break;
      case 'imap':
        emailProvider = new ImapProvider(this.db, config);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    const result = await emailProvider.authenticate();
    if (result.success && result.account) {
      this.providers.set(result.account.id, emailProvider);
      return result.account;
    }
    
    throw new Error(result.error || 'Authentication failed');
  }
  
  async removeAccount(accountId: string): Promise<void> {
    this.providers.delete(accountId);
    this.db.deleteAccount(accountId);
  }
  
  async authenticateGmail(): Promise<{ success: boolean; account?: any }> {
    const provider = new GmailProvider(this.db);
    const result = await provider.authenticate();
    
    if (result.success && result.account) {
      this.providers.set(result.account.id, provider);
    }
    
    return result;
  }
  
  async authenticateOutlook(): Promise<{ success: boolean; account?: any }> {
    const provider = new OutlookProvider(this.db);
    const result = await provider.authenticate();
    
    if (result.success && result.account) {
      this.providers.set(result.account.id, provider);
    }
    
    return result;
  }
  
  async syncEmails(accountId: string): Promise<void> {
    const account = this.db.getAccount(accountId);
    if (!account) throw new Error('Account not found');
    
    let provider = this.providers.get(accountId);
    
    if (!provider) {
      // Recreate provider from stored credentials
      provider = await this.createProviderFromAccount(account);
      this.providers.set(accountId, provider);
    }
    
    await provider.syncEmails(accountId);
    
    // Update last sync time
    this.db.updateAccount(accountId, { lastSync: new Date().toISOString() });
  }
  
  async syncAllAccounts(): Promise<void> {
    const accounts = this.db.getAccounts();
    for (const account of accounts) {
      try {
        await this.syncEmails(account.id);
      } catch (error) {
        console.error(`Failed to sync account ${account.email}:`, error);
      }
    }
  }
  
  async archiveEmail(accountId: string, emailId: string): Promise<void> {
    const provider = this.providers.get(accountId);
    if (provider) {
      await provider.archiveEmail(emailId);
    }
  }
  
  async deleteEmail(accountId: string, emailId: string): Promise<void> {
    const provider = this.providers.get(accountId);
    if (provider) {
      await provider.deleteEmail(emailId);
    }
    this.db.deleteEmails([emailId]);
  }
  
  async moveEmail(accountId: string, emailId: string, folder: string): Promise<void> {
    const provider = this.providers.get(accountId);
    if (provider) {
      await provider.moveEmail(emailId, folder);
    }
  }
  
  private async createProviderFromAccount(account: any): Promise<EmailProvider> {
    switch (account.provider) {
      case 'gmail':
        return new GmailProvider(this.db, {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          email: account.email,
        });
      case 'outlook':
        return new OutlookProvider(this.db, {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          email: account.email,
        });
      case 'imap':
        return new ImapProvider(this.db, {
          // IMAP config stored in account
        });
      default:
        throw new Error(`Unknown provider: ${account.provider}`);
    }
  }
}

