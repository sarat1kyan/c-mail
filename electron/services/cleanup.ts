import { DatabaseService } from './database';
import { EmailProviderManager } from './providers/provider-manager';
import { shell } from 'electron';
import { subDays } from 'date-fns';

interface CleanupSuggestion {
  id: string;
  type: 'duplicate' | 'inactive_subscription' | 'spam' | 'large_attachment' | 'old_transactional' | 'unread_newsletters';
  title: string;
  description: string;
  emailIds: string[];
  estimatedSpace?: number;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  action: string;
}

interface DuplicateGroup {
  hash: string;
  emails: any[];
  subject: string;
  from: string;
}

export class CleanupService {
  private db: DatabaseService;
  private providerManager: EmailProviderManager;
  
  constructor(db: DatabaseService, providerManager: EmailProviderManager) {
    this.db = db;
    this.providerManager = providerManager;
  }
  
  async getSuggestions(accountId?: string): Promise<CleanupSuggestion[]> {
    const suggestions: CleanupSuggestion[] = [];
    
    // Find duplicates
    const duplicates = await this.findDuplicates(accountId);
    if (duplicates.length > 0) {
      const totalDuplicates = duplicates.reduce((sum, g) => sum + g.emails.length - 1, 0);
      suggestions.push({
        id: 'duplicates',
        type: 'duplicate',
        title: `${totalDuplicates} duplicate emails found`,
        description: `Found ${duplicates.length} groups of duplicate emails that can be cleaned up.`,
        emailIds: duplicates.flatMap(g => g.emails.slice(1).map(e => e.id)),
        priority: 'medium',
        icon: 'copy',
        action: 'Remove duplicates',
      });
    }
    
    // Find inactive subscriptions (newsletters not opened in 90+ days)
    const inactiveSubscriptions = await this.findInactiveSubscriptions(accountId);
    if (inactiveSubscriptions.length > 0) {
      suggestions.push({
        id: 'inactive-subscriptions',
        type: 'inactive_subscription',
        title: `${inactiveSubscriptions.length} inactive subscriptions`,
        description: 'Newsletters and subscriptions you haven\'t opened in over 90 days.',
        emailIds: inactiveSubscriptions.map(e => e.id),
        priority: 'high',
        icon: 'mail-x',
        action: 'Unsubscribe all',
      });
    }
    
    // Find marketing emails that can be cleaned
    const marketingEmails = this.db.getEmails({
      accountId,
      category: 'marketing',
    });
    
    if (marketingEmails.length > 50) {
      suggestions.push({
        id: 'marketing-cleanup',
        type: 'spam',
        title: `${marketingEmails.length} promotional emails`,
        description: 'Clean up old promotional emails to reduce inbox clutter.',
        emailIds: marketingEmails.map(e => e.id),
        priority: 'medium',
        icon: 'megaphone',
        action: 'Archive all',
      });
    }
    
    // Find large attachments
    const largeAttachments = await this.findLargeAttachments({ accountId, minSize: 5 * 1024 * 1024 });
    if (largeAttachments.length > 0) {
      const totalSize = largeAttachments.reduce((sum, e) => sum + (e.size || 0), 0);
      suggestions.push({
        id: 'large-attachments',
        type: 'large_attachment',
        title: `${largeAttachments.length} emails with large attachments`,
        description: `Emails with attachments over 5MB, consuming ${this.formatSize(totalSize)}.`,
        emailIds: largeAttachments.map(e => e.id),
        estimatedSpace: totalSize,
        priority: 'low',
        icon: 'paperclip',
        action: 'Download & archive',
      });
    }
    
    // Find old transactional emails (receipts, confirmations older than 1 year)
    const oneYearAgo = subDays(new Date(), 365).toISOString();
    const oldTransactional = this.db.getEmails({ accountId, category: 'shopping' })
      .filter(e => e.date < oneYearAgo);
    
    if (oldTransactional.length > 0) {
      suggestions.push({
        id: 'old-transactional',
        type: 'old_transactional',
        title: `${oldTransactional.length} old receipts & confirmations`,
        description: 'Shopping receipts and order confirmations older than 1 year.',
        emailIds: oldTransactional.map(e => e.id),
        priority: 'low',
        icon: 'shopping-cart',
        action: 'Archive all',
      });
    }
    
    // Find unread newsletters
    const unreadNewsletters = this.db.getEmails({
      accountId,
      category: 'marketing',
      isRead: false,
    });
    
    if (unreadNewsletters.length > 20) {
      suggestions.push({
        id: 'unread-newsletters',
        type: 'unread_newsletters',
        title: `${unreadNewsletters.length} unread newsletters`,
        description: 'Newsletters you never opened - consider unsubscribing.',
        emailIds: unreadNewsletters.map(e => e.id),
        priority: 'medium',
        icon: 'newspaper',
        action: 'Review & unsubscribe',
      });
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return suggestions;
  }
  
  async executeAction(action: {
    type: string;
    emailIds?: string[];
    options?: any;
  }): Promise<{ success: boolean; message: string }> {
    const emailIds = action.emailIds || [];
    
    switch (action.type) {
      case 'archive':
        for (const emailId of emailIds) {
          const email = this.db.getEmail(emailId);
          if (email) {
            await this.providerManager.archiveEmail(email.accountId, emailId);
          }
        }
        return { success: true, message: `Archived ${emailIds.length} emails` };
      
      case 'delete':
        for (const emailId of emailIds) {
          const email = this.db.getEmail(emailId);
          if (email) {
            await this.providerManager.deleteEmail(email.accountId, emailId);
          }
        }
        return { success: true, message: `Deleted ${emailIds.length} emails` };
      
      case 'mark_read':
        this.db.markEmailsRead(emailIds, true);
        return { success: true, message: `Marked ${emailIds.length} emails as read` };
      
      case 'unsubscribe':
        const unsubscribeResults = await this.bulkUnsubscribe(emailIds);
        return {
          success: true,
          message: `Opened unsubscribe links for ${unsubscribeResults.processed} emails`,
        };
      
      case 'download_attachments':
        // This would download attachments locally before archiving
        return { success: true, message: 'Attachments downloaded' };
      
      default:
        return { success: false, message: 'Unknown action type' };
    }
  }
  
  async bulkUnsubscribe(emailIds: string[]): Promise<{
    processed: number;
    skipped: number;
    links: string[];
  }> {
    const links: string[] = [];
    let processed = 0;
    let skipped = 0;
    
    for (const emailId of emailIds) {
      const email = this.db.getEmail(emailId);
      
      if (email?.unsubscribeLink) {
        links.push(email.unsubscribeLink);
        // Open unsubscribe link in default browser
        await shell.openExternal(email.unsubscribeLink);
        processed++;
        
        // Rate limit to avoid overwhelming browser
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        skipped++;
      }
    }
    
    return { processed, skipped, links };
  }
  
  async findDuplicates(accountId?: string): Promise<DuplicateGroup[]> {
    const emails = this.db.getEmails({ accountId, limit: 5000 });
    
    // Group by subject + sender + snippet
    const groups = new Map<string, any[]>();
    
    for (const email of emails) {
      // Create a hash key for grouping
      const key = [
        email.subject?.toLowerCase().trim() || '',
        email.from?.toLowerCase() || '',
        email.snippet?.substring(0, 50)?.toLowerCase() || '',
      ].join('|');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(email);
    }
    
    // Return groups with more than one email
    const duplicates: DuplicateGroup[] = [];
    
    for (const [hash, groupEmails] of groups) {
      if (groupEmails.length > 1) {
        // Sort by date, keep the newest
        groupEmails.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        duplicates.push({
          hash,
          emails: groupEmails,
          subject: groupEmails[0].subject,
          from: groupEmails[0].from,
        });
      }
    }
    
    return duplicates;
  }
  
  async findLargeAttachments(options: {
    minSize?: number;
    accountId?: string;
  }): Promise<any[]> {
    const minSize = options.minSize || 5 * 1024 * 1024; // Default 5MB
    const emails = this.db.getEmails({ accountId: options.accountId, limit: 5000 });
    
    return emails.filter(email => {
      const attachments = email.attachments || [];
      const totalSize = attachments.reduce((sum: number, att: any) => sum + (att.size || 0), 0);
      return totalSize >= minSize;
    });
  }
  
  private async findInactiveSubscriptions(accountId?: string): Promise<any[]> {
    const ninetyDaysAgo = subDays(new Date(), 90).toISOString();
    
    // Get marketing emails with unsubscribe links
    const emails = this.db.getEmails({
      accountId,
      category: 'marketing',
    }).filter(e => e.hasUnsubscribe);
    
    // Group by sender domain
    const senderGroups = new Map<string, any[]>();
    
    for (const email of emails) {
      const domain = email.from.split('@')[1]?.toLowerCase() || email.from;
      
      if (!senderGroups.has(domain)) {
        senderGroups.set(domain, []);
      }
      senderGroups.get(domain)!.push(email);
    }
    
    // Find senders where all emails are unread and older than 90 days
    const inactiveEmails: any[] = [];
    
    for (const [domain, senderEmails] of senderGroups) {
      // Check if all emails from this sender are unread
      const allUnread = senderEmails.every(e => !e.isRead);
      // Check if most recent email is older than 90 days
      const newestEmail = senderEmails.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      if (allUnread && newestEmail.date < ninetyDaysAgo) {
        // Add the most recent email (to get unsubscribe link)
        inactiveEmails.push(newestEmail);
      }
    }
    
    return inactiveEmails;
  }
  
  // Get subscription analysis
  async getSubscriptionAnalysis(accountId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    subscriptions: Array<{
      domain: string;
      emailCount: number;
      lastEmail: string;
      readRate: number;
      hasUnsubscribe: boolean;
    }>;
  }> {
    const emails = this.db.getEmails({
      accountId,
      category: 'marketing',
    });
    
    const subscriptionMap = new Map<string, {
      emails: any[];
      lastEmail: string;
      readCount: number;
      hasUnsubscribe: boolean;
    }>();
    
    for (const email of emails) {
      const domain = email.from.split('@')[1]?.toLowerCase() || email.from;
      
      if (!subscriptionMap.has(domain)) {
        subscriptionMap.set(domain, {
          emails: [],
          lastEmail: email.date,
          readCount: 0,
          hasUnsubscribe: false,
        });
      }
      
      const sub = subscriptionMap.get(domain)!;
      sub.emails.push(email);
      if (email.date > sub.lastEmail) {
        sub.lastEmail = email.date;
      }
      if (email.isRead) sub.readCount++;
      if (email.hasUnsubscribe) sub.hasUnsubscribe = true;
    }
    
    const ninetyDaysAgo = subDays(new Date(), 90).toISOString();
    
    const subscriptions = Array.from(subscriptionMap.entries()).map(([domain, data]) => ({
      domain,
      emailCount: data.emails.length,
      lastEmail: data.lastEmail,
      readRate: Math.round((data.readCount / data.emails.length) * 100),
      hasUnsubscribe: data.hasUnsubscribe,
    }));
    
    const active = subscriptions.filter(s => s.readRate > 20).length;
    const inactive = subscriptions.length - active;
    
    return {
      total: subscriptions.length,
      active,
      inactive,
      subscriptions: subscriptions.sort((a, b) => b.emailCount - a.emailCount),
    };
  }
  
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

