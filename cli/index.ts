#!/usr/bin/env node
/**
 * C-Mail Intelligence CLI
 * Command-line interface for email intelligence and automation
 */

import { Command } from 'commander';
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const program = new Command();

// Database path
const DB_PATH = path.join(os.homedir(), '.cmail', 'cmail.db');

// Initialize database connection
let db: any;

async function initDB(): Promise<void> {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error('Error: Database not found. Please run the desktop app first to initialize.');
      process.exit(1);
    }
    
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } catch (error) {
    console.error('Error: Could not open database.');
    process.exit(1);
  }
}

function query<T>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = query<T>(sql, params);
  return results[0];
}

program
  .name('cmail')
  .description('C-Mail Intelligence - Email Management CLI')
  .version('1.0.0');

// Status command
program
  .command('status')
  .description('Show current status and account information')
  .action(async () => {
    await initDB();
    
    const accounts = query<any>('SELECT * FROM accounts');
    const emailCount = queryOne<any>('SELECT COUNT(*) as count FROM emails');
    const unreadCount = queryOne<any>('SELECT COUNT(*) as count FROM emails WHERE is_read = 0');
    const ruleCount = queryOne<any>('SELECT COUNT(*) as count FROM rules WHERE enabled = 1');
    
    console.log('\n📧 C-Mail Intelligence Status\n');
    console.log('━'.repeat(40));
    
    console.log('\n📊 Overview:');
    console.log(`   Total Emails: ${(emailCount?.count || 0).toLocaleString()}`);
    console.log(`   Unread: ${(unreadCount?.count || 0).toLocaleString()}`);
    console.log(`   Active Rules: ${ruleCount?.count || 0}`);
    
    console.log('\n👤 Connected Accounts:');
    if (accounts.length === 0) {
      console.log('   No accounts connected');
    } else {
      accounts.forEach((acc: any) => {
        console.log(`   • ${acc.email} (${acc.provider})`);
        if (acc.last_sync) {
          console.log(`     Last sync: ${new Date(acc.last_sync).toLocaleString()}`);
        }
      });
    }
    
    console.log('\n');
    db.close();
  });

// Categories command
program
  .command('categories')
  .description('Show email categories and counts')
  .action(async () => {
    await initDB();
    
    const stats = query<any>(`
      SELECT category, COUNT(*) as count
      FROM emails
      GROUP BY category
      ORDER BY count DESC
    `);
    
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    
    console.log('\n📁 Email Categories\n');
    console.log('━'.repeat(50));
    
    stats.forEach((stat: any) => {
      const percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
      const bar = '█'.repeat(Math.min(Math.round(percentage / 5), 20));
      const spaces = ' '.repeat(20 - bar.length);
      console.log(`${stat.category.padEnd(15)} ${bar}${spaces} ${stat.count} (${percentage}%)`);
    });
    
    console.log('\n');
    db.close();
  });

// Summary command
program
  .command('summary')
  .description('Generate executive summary')
  .option('-p, --period <period>', 'Time period: day, week, month', 'week')
  .action(async (options) => {
    await initDB();
    
    const days = options.period === 'day' ? 1 : options.period === 'week' ? 7 : 30;
    const periodLabel = options.period === 'day' ? 'Today' : options.period === 'week' ? 'This Week' : 'This Month';
    
    const totalEmails = queryOne<any>(`
      SELECT COUNT(*) as count FROM emails
      WHERE date >= datetime('now', '-${days} days')
    `);
    
    const categoryStats = query<any>(`
      SELECT category, COUNT(*) as count
      FROM emails
      WHERE date >= datetime('now', '-${days} days')
      GROUP BY category
      ORDER BY count DESC
    `);
    
    const unreadImportant = queryOne<any>(`
      SELECT COUNT(*) as count FROM emails
      WHERE category = 'important' AND is_read = 0
    `);
    
    console.log(`\n📊 Executive Summary - ${periodLabel}\n`);
    console.log('━'.repeat(50));
    
    console.log(`\n📬 Received ${totalEmails?.count || 0} emails\n`);
    
    if (categoryStats.length > 0) {
      console.log('Category Breakdown:');
      categoryStats.forEach((stat: any) => {
        const emoji = getCategoryEmoji(stat.category);
        console.log(`   ${emoji} ${stat.category}: ${stat.count} emails`);
      });
    }
    
    if ((unreadImportant?.count || 0) > 0) {
      console.log(`\n⚠️  ${unreadImportant?.count} important emails need attention!`);
    } else {
      console.log('\n✅ All important emails have been read');
    }
    
    console.log('\n');
    db.close();
  });

// Rules command
program
  .command('rules')
  .description('List automation rules')
  .option('-a, --all', 'Show all rules including disabled')
  .action(async (options) => {
    await initDB();
    
    let sql = 'SELECT * FROM rules';
    if (!options.all) {
      sql += ' WHERE enabled = 1';
    }
    sql += ' ORDER BY priority DESC';
    
    const rules = query<any>(sql);
    
    console.log('\n⚡ Automation Rules\n');
    console.log('━'.repeat(50));
    
    if (rules.length === 0) {
      console.log('No rules configured');
    } else {
      rules.forEach((rule: any, i: number) => {
        const status = rule.enabled ? '✅' : '⏸️ ';
        console.log(`\n${i + 1}. ${status} ${rule.name}`);
        
        const conditions = JSON.parse(rule.conditions);
        const actions = JSON.parse(rule.actions);
        
        console.log('   Conditions:');
        conditions.forEach((c: any) => {
          console.log(`     - ${c.field} ${c.operator} "${c.value}"`);
        });
        
        console.log('   Actions:');
        actions.forEach((a: any) => {
          console.log(`     - ${a.type}${a.value ? `: ${a.value}` : ''}`);
        });
        
        if (rule.hit_count > 0) {
          console.log(`   Matched: ${rule.hit_count} times`);
        }
      });
    }
    
    console.log('\n');
    db.close();
  });

// Search command
program
  .command('search <query>')
  .description('Search emails')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('-c, --category <category>', 'Filter by category')
  .action(async (searchQuery, options) => {
    await initDB();
    
    let sql = `
      SELECT * FROM emails
      WHERE (subject LIKE ? OR snippet LIKE ? OR from_address LIKE ? OR from_name LIKE ?)
    `;
    const params: any[] = [
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
      `%${searchQuery}%`,
    ];
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    
    sql += ` ORDER BY date DESC LIMIT ?`;
    params.push(parseInt(options.limit));
    
    const emails = query<any>(sql, params);
    
    console.log(`\n🔍 Search Results for "${searchQuery}"\n`);
    console.log('━'.repeat(50));
    
    if (emails.length === 0) {
      console.log('No emails found');
    } else {
      emails.forEach((email: any) => {
        const read = email.is_read ? '  ' : '●';
        const date = new Date(email.date).toLocaleDateString();
        console.log(`\n${read} [${date}] ${email.from_name || email.from_address}`);
        console.log(`   ${email.subject}`);
        if (email.snippet) {
          console.log(`   ${email.snippet.substring(0, 60)}...`);
        }
      });
    }
    
    console.log(`\n  Found ${emails.length} results\n`);
    db.close();
  });

// Cleanup suggestions
program
  .command('cleanup')
  .description('Show cleanup suggestions')
  .action(async () => {
    await initDB();
    
    console.log('\n🧹 Cleanup Suggestions\n');
    console.log('━'.repeat(50));
    
    // Marketing emails count
    const marketingCount = queryOne<any>(`
      SELECT COUNT(*) as count FROM emails WHERE category = 'marketing'
    `);
    
    if ((marketingCount?.count || 0) > 50) {
      console.log(`\n📢 ${marketingCount?.count} promotional emails`);
      console.log('   Consider archiving old promotional content');
    }
    
    // Unread newsletters
    const unreadNewsletters = queryOne<any>(`
      SELECT COUNT(*) as count FROM emails 
      WHERE category = 'marketing' AND is_read = 0
    `);
    
    if ((unreadNewsletters?.count || 0) > 20) {
      console.log(`\n📰 ${unreadNewsletters?.count} unread newsletters`);
      console.log('   You might want to unsubscribe from some');
    }
    
    // Old shopping emails
    const oldShopping = queryOne<any>(`
      SELECT COUNT(*) as count FROM emails 
      WHERE category = 'shopping' 
      AND date < datetime('now', '-365 days')
    `);
    
    if ((oldShopping?.count || 0) > 0) {
      console.log(`\n🛒 ${oldShopping?.count} old receipts (>1 year)`);
      console.log('   Consider archiving old order confirmations');
    }
    
    console.log('\n💡 Use the desktop app for one-click cleanup actions');
    console.log('\n');
    db.close();
  });

// Export command
program
  .command('export')
  .description('Export data')
  .option('-t, --type <type>', 'Data type: emails, rules, categories', 'rules')
  .option('-f, --format <format>', 'Format: json, csv', 'json')
  .option('-o, --output <file>', 'Output file')
  .action(async (options) => {
    await initDB();
    
    let data: any[];
    
    switch (options.type) {
      case 'emails':
        data = query<any>('SELECT * FROM emails ORDER BY date DESC LIMIT 1000');
        break;
      case 'rules':
        data = query<any>('SELECT * FROM rules');
        break;
      case 'categories':
        data = query<any>('SELECT * FROM categories');
        break;
      default:
        console.error('Invalid type. Use: emails, rules, or categories');
        process.exit(1);
    }
    
    let output: string;
    
    if (options.format === 'csv') {
      if (data.length === 0) {
        output = '';
      } else {
        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
          headers.map(h => JSON.stringify(item[h] ?? '')).join(',')
        );
        output = [headers.join(','), ...rows].join('\n');
      }
    } else {
      output = JSON.stringify(data, null, 2);
    }
    
    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(`Exported to ${options.output}`);
    } else {
      console.log(output);
    }
    
    db.close();
  });

// Stats command
program
  .command('stats')
  .description('Show detailed statistics')
  .action(async () => {
    await initDB();
    
    console.log('\n📈 Email Statistics\n');
    console.log('━'.repeat(50));
    
    // Total emails by provider
    const byProvider = query<any>(`
      SELECT a.provider, COUNT(e.id) as count
      FROM emails e
      JOIN accounts a ON e.account_id = a.id
      GROUP BY a.provider
    `);
    
    if (byProvider.length > 0) {
      console.log('\nBy Provider:');
      byProvider.forEach((p: any) => {
        console.log(`   ${p.provider}: ${p.count.toLocaleString()}`);
      });
    }
    
    // Read/Unread ratio
    const readStats = queryOne<any>(`
      SELECT 
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM emails
    `);
    
    console.log('\nRead Status:');
    console.log(`   Read: ${(readStats?.read || 0).toLocaleString()}`);
    console.log(`   Unread: ${(readStats?.unread || 0).toLocaleString()}`);
    
    // Top senders
    const topSenders = query<any>(`
      SELECT from_address, from_name, COUNT(*) as count
      FROM emails
      GROUP BY from_address
      ORDER BY count DESC
      LIMIT 5
    `);
    
    if (topSenders.length > 0) {
      console.log('\nTop Senders:');
      topSenders.forEach((s: any, i: number) => {
        console.log(`   ${i + 1}. ${s.from_name || s.from_address}: ${s.count}`);
      });
    }
    
    // Emails per day (last 7 days)
    const perDay = query<any>(`
      SELECT DATE(date) as day, COUNT(*) as count
      FROM emails
      WHERE date >= datetime('now', '-7 days')
      GROUP BY DATE(date)
      ORDER BY day
    `);
    
    if (perDay.length > 0) {
      console.log('\nLast 7 Days:');
      perDay.forEach((d: any) => {
        const bar = '█'.repeat(Math.min(d.count, 30));
        console.log(`   ${d.day}: ${bar} ${d.count}`);
      });
    }
    
    console.log('\n');
    db.close();
  });

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    financial: '🏦',
    hr: '💼',
    marketing: '📢',
    important: '⭐',
    social: '👥',
    shopping: '🛒',
    travel: '✈️',
    bills: '📄',
    uncategorized: '📥',
  };
  return emojis[category] || '📧';
}

program.parse();
