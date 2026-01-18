import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { DatabaseService } from '../database';
import { EmailProvider } from './provider-manager';
import { nanoid } from 'nanoid';

interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class ImapProvider implements EmailProvider {
  private db: DatabaseService;
  private config: ImapConfig | null = null;
  private accountId: string | null = null;
  
  constructor(db: DatabaseService, config?: ImapConfig) {
    this.db = db;
    this.config = config || null;
  }
  
  async authenticate(): Promise<{ success: boolean; account?: any; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'IMAP configuration required' };
    }
    
    try {
      const client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        logger: false,
      });
      
      await client.connect();
      await client.logout();
      
      // Create account in database
      const account = this.db.createAccount({
        email: this.config.auth.user,
        provider: 'imap',
        name: this.config.auth.user,
      });
      
      this.accountId = account.id;
      
      return { success: true, account };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  async syncEmails(accountId: string): Promise<void> {
    if (!this.config) throw new Error('IMAP not configured');
    
    this.accountId = accountId;
    
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
    
    try {
      await client.connect();
      
      // Sync INBOX
      await this.syncFolder(client, 'INBOX');
      
      // Sync Sent
      try {
        await this.syncFolder(client, 'Sent');
      } catch {
        try {
          await this.syncFolder(client, 'Sent Items');
        } catch {
          // Sent folder not found, skip
        }
      }
      
      await client.logout();
    } catch (error) {
      console.error('IMAP sync error:', error);
      throw error;
    }
  }
  
  private async syncFolder(client: ImapFlow, folder: string): Promise<void> {
    if (!this.accountId) return;
    
    const lock = await client.getMailboxLock(folder);
    
    try {
      // Get last 100 messages
      const messages: any[] = [];
      
      for await (const message of client.fetch('1:100', {
        envelope: true,
        source: true,
        flags: true,
        bodyStructure: true,
      })) {
        messages.push(message);
      }
      
      for (const message of messages) {
        await this.saveEmail(message);
      }
    } finally {
      lock.release();
    }
  }
  
  private async saveEmail(message: any): Promise<void> {
    if (!this.accountId) return;
    
    try {
      // Parse the email source
      const parsed = await simpleParser(message.source);
      
      // Extract unsubscribe link
      let unsubscribeLink = null;
      const listUnsubscribe = parsed.headers.get('list-unsubscribe');
      if (listUnsubscribe) {
        const value = typeof listUnsubscribe === 'string' ? listUnsubscribe : String(listUnsubscribe);
        const match = value.match(/<(https?:\/\/[^>]+)>/);
        if (match) {
          unsubscribeLink = match[1];
        }
      }
      
      // Extract attachments
      const attachments = (parsed.attachments || []).map(att => ({
        id: nanoid(),
        filename: att.filename || 'attachment',
        mimeType: att.contentType,
        size: att.size,
      }));
      
      const email = {
        id: nanoid(),
        accountId: this.accountId,
        messageId: parsed.messageId || message.uid.toString(),
        threadId: parsed.references?.[0] || parsed.messageId,
        from: parsed.from?.value?.[0]?.address || '',
        fromName: parsed.from?.value?.[0]?.name || '',
        to: parsed.to?.value?.map((addr: any) => addr.address) || [],
        cc: parsed.cc?.value?.map((addr: any) => addr.address) || [],
        subject: parsed.subject || '',
        snippet: (parsed.text || '').substring(0, 200),
        body: parsed.text || '',
        bodyHtml: parsed.html || '',
        date: parsed.date?.toISOString() || new Date().toISOString(),
        isRead: message.flags?.has('\\Seen') || false,
        isStarred: message.flags?.has('\\Flagged') || false,
        labels: Array.from(message.flags || []),
        category: 'uncategorized',
        importance: 0.5,
        attachments,
        size: message.source?.length || 0,
        unsubscribeLink,
        hasUnsubscribe: !!unsubscribeLink,
      };
      
      this.db.saveEmail(email);
    } catch (error) {
      console.error('Failed to parse email:', error);
    }
  }
  
  async archiveEmail(emailId: string): Promise<void> {
    if (!this.config) return;
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
    
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      
      try {
        // Try to move to Archive folder
        await client.messageMove(email.messageId, 'Archive');
      } catch {
        // Archive folder might not exist, create it
        try {
          await client.mailboxCreate('Archive');
          await client.messageMove(email.messageId, 'Archive');
        } catch {
          // Just mark as read if can't archive
          await client.messageFlagsAdd(email.messageId, ['\\Seen']);
        }
      }
      
      lock.release();
      await client.logout();
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  }
  
  async deleteEmail(emailId: string): Promise<void> {
    if (!this.config) return;
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
    
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      
      await client.messageDelete(email.messageId);
      
      lock.release();
      await client.logout();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  }
  
  async moveEmail(emailId: string, folder: string): Promise<void> {
    if (!this.config) return;
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
    
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      
      // Create folder if it doesn't exist
      try {
        await client.mailboxCreate(folder);
      } catch {
        // Folder might already exist
      }
      
      await client.messageMove(email.messageId, folder);
      
      lock.release();
      await client.logout();
    } catch (error) {
      console.error('Failed to move email:', error);
    }
  }
  
  async markRead(emailId: string, read: boolean): Promise<void> {
    if (!this.config) return;
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
    
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      
      if (read) {
        await client.messageFlagsAdd(email.messageId, ['\\Seen']);
      } else {
        await client.messageFlagsRemove(email.messageId, ['\\Seen']);
      }
      
      lock.release();
      await client.logout();
    } catch (error) {
      console.error('Failed to mark email:', error);
    }
  }
  
  async getUnsubscribeLink(emailId: string): Promise<string | null> {
    const email = this.db.getEmail(emailId);
    return email?.unsubscribeLink || null;
  }
}

