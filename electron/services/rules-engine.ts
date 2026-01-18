import { DatabaseService } from './database';
import { EmailProviderManager } from './providers/provider-manager';
import { nanoid } from 'nanoid';

interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'date' | 'hasAttachment' | 'category' | 'size';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'before' | 'after' | 'greaterThan' | 'lessThan';
  value: string;
}

interface RuleAction {
  type: 'move' | 'label' | 'archive' | 'delete' | 'markRead' | 'markUnread' | 'star' | 'categorize' | 'forward';
  value?: string;
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

interface RuleSuggestion {
  id: string;
  rule: Omit<Rule, 'id' | 'hitCount' | 'lastHit' | 'createdAt' | 'updatedAt'>;
  confidence: number;
  reason: string;
  sampleEmails: any[];
}

export class RulesEngine {
  private db: DatabaseService;
  private providerManager: EmailProviderManager;
  
  constructor(db: DatabaseService, providerManager: EmailProviderManager) {
    this.db = db;
    this.providerManager = providerManager;
  }
  
  async createRule(ruleInput: {
    name: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    provider?: string;
    priority?: number;
  }): Promise<Rule> {
    const rule = {
      id: nanoid(),
      name: ruleInput.name,
      enabled: true,
      conditions: ruleInput.conditions,
      actions: ruleInput.actions,
      provider: ruleInput.provider,
      priority: ruleInput.priority || 0,
      hitCount: 0,
    };
    
    return this.db.saveRule(rule);
  }
  
  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule> {
    const existing = this.db.getRule(ruleId);
    if (!existing) throw new Error('Rule not found');
    
    const updated = { ...existing, ...updates };
    return this.db.saveRule(updated);
  }
  
  async deleteRule(ruleId: string): Promise<void> {
    this.db.deleteRule(ruleId);
  }
  
  async applyRulesToEmail(email: any): Promise<RuleAction[]> {
    const rules = this.db.getRules().filter(r => r.enabled);
    const appliedActions: RuleAction[] = [];
    
    // Sort by priority (higher first)
    rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of rules) {
      if (this.matchesConditions(email, rule.conditions)) {
        appliedActions.push(...rule.actions);
        
        // Update hit count
        this.db.saveRule({
          ...rule,
          hitCount: rule.hitCount + 1,
          lastHit: new Date().toISOString(),
        });
        
        // Execute actions
        await this.executeActions(email, rule.actions);
      }
    }
    
    return appliedActions;
  }
  
  private matchesConditions(email: any, conditions: RuleCondition[]): boolean {
    for (const condition of conditions) {
      if (!this.matchesCondition(email, condition)) {
        return false;
      }
    }
    return true;
  }
  
  private matchesCondition(email: any, condition: RuleCondition): boolean {
    let fieldValue: string | number | boolean;
    
    switch (condition.field) {
      case 'from':
        fieldValue = (email.from || '').toLowerCase();
        break;
      case 'to':
        fieldValue = (Array.isArray(email.to) ? email.to.join(' ') : email.to || '').toLowerCase();
        break;
      case 'subject':
        fieldValue = (email.subject || '').toLowerCase();
        break;
      case 'body':
        fieldValue = (email.body || email.snippet || '').toLowerCase();
        break;
      case 'category':
        fieldValue = (email.category || '').toLowerCase();
        break;
      case 'date':
        fieldValue = email.date || '';
        break;
      case 'hasAttachment':
        fieldValue = (email.attachments?.length || 0) > 0;
        break;
      case 'size':
        fieldValue = email.size || 0;
        break;
      default:
        return false;
    }
    
    const conditionValue = condition.value.toLowerCase();
    
    switch (condition.operator) {
      case 'contains':
        return String(fieldValue).includes(conditionValue);
      case 'equals':
        return String(fieldValue) === conditionValue;
      case 'startsWith':
        return String(fieldValue).startsWith(conditionValue);
      case 'endsWith':
        return String(fieldValue).endsWith(conditionValue);
      case 'regex':
        try {
          return new RegExp(condition.value, 'i').test(String(fieldValue));
        } catch {
          return false;
        }
      case 'before':
        return String(fieldValue) < conditionValue;
      case 'after':
        return String(fieldValue) > conditionValue;
      case 'greaterThan':
        return Number(fieldValue) > Number(condition.value);
      case 'lessThan':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  }
  
  private async executeActions(email: any, actions: RuleAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'move':
            await this.providerManager.moveEmail(email.accountId, email.id, action.value!);
            break;
          case 'archive':
            await this.providerManager.archiveEmail(email.accountId, email.id);
            break;
          case 'delete':
            await this.providerManager.deleteEmail(email.accountId, email.id);
            break;
          case 'markRead':
            this.db.markEmailsRead([email.id], true);
            break;
          case 'markUnread':
            this.db.markEmailsRead([email.id], false);
            break;
          case 'categorize':
            this.db.updateEmailCategory(email.id, action.value!);
            break;
          case 'label':
            // Add label to email
            const currentLabels = email.labels || [];
            if (!currentLabels.includes(action.value)) {
              // Would need to add label update method
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }
  
  async testRule(ruleId: string): Promise<{ matchingEmails: any[]; totalMatches: number }> {
    const rule = this.db.getRule(ruleId);
    if (!rule) throw new Error('Rule not found');
    
    const allEmails = this.db.getEmails({ limit: 1000 });
    const matchingEmails = allEmails.filter(email => 
      this.matchesConditions(email, rule.conditions)
    );
    
    return {
      matchingEmails: matchingEmails.slice(0, 10),
      totalMatches: matchingEmails.length,
    };
  }
  
  async getSuggestions(): Promise<RuleSuggestion[]> {
    const suggestions: RuleSuggestion[] = [];
    const emails = this.db.getEmails({ limit: 2000 });
    
    // Group emails by sender domain
    const senderGroups = new Map<string, any[]>();
    for (const email of emails) {
      const domain = email.from.split('@')[1]?.toLowerCase();
      if (!domain) continue;
      
      if (!senderGroups.has(domain)) {
        senderGroups.set(domain, []);
      }
      senderGroups.get(domain)!.push(email);
    }
    
    // Suggest rules for frequent senders with consistent categories
    for (const [domain, domainEmails] of senderGroups) {
      if (domainEmails.length < 5) continue;
      
      // Check if all emails have same category
      const categories = new Map<string, number>();
      for (const email of domainEmails) {
        categories.set(email.category, (categories.get(email.category) || 0) + 1);
      }
      
      // Find dominant category
      let dominantCategory = 'uncategorized';
      let dominantCount = 0;
      for (const [cat, count] of categories) {
        if (count > dominantCount) {
          dominantCount = count;
          dominantCategory = cat;
        }
      }
      
      const confidence = dominantCount / domainEmails.length;
      
      if (confidence > 0.8 && dominantCategory !== 'uncategorized') {
        suggestions.push({
          id: nanoid(),
          rule: {
            name: `Auto-categorize @${domain}`,
            enabled: true,
            conditions: [{
              field: 'from',
              operator: 'contains',
              value: `@${domain}`,
            }],
            actions: [{
              type: 'categorize',
              value: dominantCategory,
            }],
            priority: 0,
          },
          confidence,
          reason: `${dominantCount} of ${domainEmails.length} emails from @${domain} are in the ${dominantCategory} category`,
          sampleEmails: domainEmails.slice(0, 3),
        });
      }
      
      // Suggest archive rule for old marketing emails
      if (dominantCategory === 'marketing' && domainEmails.length > 20) {
        suggestions.push({
          id: nanoid(),
          rule: {
            name: `Archive old emails from @${domain}`,
            enabled: true,
            conditions: [
              {
                field: 'from',
                operator: 'contains',
                value: `@${domain}`,
              },
              {
                field: 'date',
                operator: 'before',
                value: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
            actions: [{
              type: 'archive',
            }],
            priority: 0,
          },
          confidence: 0.9,
          reason: `You have ${domainEmails.length} marketing emails from @${domain}. Consider archiving older ones.`,
          sampleEmails: domainEmails.slice(0, 3),
        });
      }
    }
    
    // Suggest rules for financial emails
    const financialEmails = emails.filter(e => e.category === 'financial');
    if (financialEmails.length > 10) {
      const financialDomains = new Set(
        financialEmails.map(e => e.from.split('@')[1]?.toLowerCase()).filter(Boolean)
      );
      
      if (financialDomains.size > 0) {
        suggestions.push({
          id: nanoid(),
          rule: {
            name: 'Move bank statements to Finance folder',
            enabled: true,
            conditions: [
              { field: 'category', operator: 'equals', value: 'financial' },
              { field: 'subject', operator: 'contains', value: 'statement' },
            ],
            actions: [
              { type: 'move', value: 'Finance' },
              { type: 'markRead', value: '' },
            ],
            priority: 5,
          },
          confidence: 0.85,
          reason: `Automatically organize bank statements from ${financialDomains.size} financial institutions`,
          sampleEmails: financialEmails.slice(0, 3),
        });
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return suggestions.slice(0, 10);
  }
  
  // Export rules in a format compatible with other email providers
  async exportRulesForProvider(provider: 'gmail' | 'outlook'): Promise<string> {
    const rules = this.db.getRules();
    
    if (provider === 'gmail') {
      return this.convertToGmailFilters(rules);
    } else {
      return this.convertToOutlookRules(rules);
    }
  }
  
  private convertToGmailFilters(rules: Rule[]): string {
    // Gmail filter format (simplified XML)
    const filters = rules.map(rule => {
      const criteria: string[] = [];
      
      for (const condition of rule.conditions) {
        switch (condition.field) {
          case 'from':
            criteria.push(`from:${condition.value}`);
            break;
          case 'to':
            criteria.push(`to:${condition.value}`);
            break;
          case 'subject':
            criteria.push(`subject:${condition.value}`);
            break;
        }
      }
      
      const actions: string[] = [];
      for (const action of rule.actions) {
        switch (action.type) {
          case 'archive':
            actions.push('shouldArchive');
            break;
          case 'markRead':
            actions.push('shouldMarkAsRead');
            break;
          case 'delete':
            actions.push('shouldTrash');
            break;
          case 'label':
            actions.push(`label:${action.value}`);
            break;
        }
      }
      
      return {
        name: rule.name,
        criteria: criteria.join(' '),
        actions,
      };
    });
    
    return JSON.stringify(filters, null, 2);
  }
  
  private convertToOutlookRules(rules: Rule[]): string {
    // Outlook rule format (simplified)
    const outlookRules = rules.map(rule => {
      const conditions = rule.conditions.map(c => ({
        type: c.field,
        value: c.value,
        operation: c.operator,
      }));
      
      const actions = rule.actions.map(a => ({
        action: a.type,
        value: a.value,
      }));
      
      return {
        displayName: rule.name,
        sequence: rule.priority,
        isEnabled: rule.enabled,
        conditions,
        actions,
      };
    });
    
    return JSON.stringify(outlookRules, null, 2);
  }
}

