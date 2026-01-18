import { BrowserWindow } from 'electron';
import { Client } from '@microsoft/microsoft-graph-client';
import { DatabaseService } from '../database';
import { EmailProvider } from './provider-manager';
import { nanoid } from 'nanoid';

const OUTLOOK_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
];

// OAuth credentials - Set these environment variables before running:
// OUTLOOK_CLIENT_ID - Get from Azure Portal (https://portal.azure.com)
// OUTLOOK_CLIENT_SECRET - Get from Azure Portal
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || '';
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:8235/oauth/callback';
const AUTHORITY = 'https://login.microsoftonline.com/common';

export class OutlookProvider implements EmailProvider {
  private db: DatabaseService;
  private graphClient: Client | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accountId: string | null = null;
  
  constructor(db: DatabaseService, config?: any) {
    this.db = db;
    
    if (config?.accessToken) {
      this.accessToken = config.accessToken;
      this.refreshToken = config.refreshToken;
      this.initGraphClient();
    }
  }
  
  private initGraphClient(): void {
    if (!this.accessToken) return;
    
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken!);
      },
    });
  }
  
  async authenticate(): Promise<{ success: boolean; account?: any; error?: string }> {
    return new Promise((resolve) => {
      const authUrl = `${AUTHORITY}/oauth2/v2.0/authorize?` + new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        response_mode: 'query',
        scope: OUTLOOK_SCOPES.join(' '),
        prompt: 'consent',
      }).toString();
      
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      
      const http = require('http');
      const url = require('url');
      
      const server = http.createServer(async (req: any, res: any) => {
        const query = url.parse(req.url, true).query;
        
        if (query.code) {
          try {
            // Exchange code for tokens
            const tokenResponse = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: query.code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
              }).toString(),
            });
            
            const tokens = await tokenResponse.json();
            
            if (tokens.error) {
              throw new Error(tokens.error_description || tokens.error);
            }
            
            this.accessToken = tokens.access_token;
            this.refreshToken = tokens.refresh_token;
            this.initGraphClient();
            
            // Get user info
            const userInfo = await this.graphClient!.api('/me').get();
            
            // Create account in database
            const account = this.db.createAccount({
              email: userInfo.mail || userInfo.userPrincipalName,
              provider: 'outlook',
              name: userInfo.displayName,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiry: (Date.now() + tokens.expires_in * 1000).toString(),
            });
            
            this.accountId = account.id;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
                  <div style="text-align: center;">
                    <h1>✓ Outlook Connected</h1>
                    <p>You can close this window now.</p>
                  </div>
                </body>
              </html>
            `);
            
            authWindow.close();
            server.close();
            
            resolve({ success: true, account });
          } catch (error: any) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication failed</h1>');
            authWindow.close();
            server.close();
            resolve({ success: false, error: error.message });
          }
        }
      });
      
      server.listen(8235, () => {
        authWindow.loadURL(authUrl);
      });
      
      authWindow.on('closed', () => {
        server.close();
      });
    });
  }
  
  async syncEmails(accountId: string): Promise<void> {
    if (!this.graphClient) throw new Error('Outlook not authenticated');
    
    this.accountId = accountId;
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded();
    
    // Get messages from inbox
    const response = await this.graphClient
      .api('/me/mailFolders/inbox/messages')
      .top(100)
      .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,attachments,internetMessageHeaders')
      .expand('attachments')
      .get();
    
    for (const message of response.value) {
      await this.saveEmail(message);
    }
    
    // Also get sent items
    const sentResponse = await this.graphClient
      .api('/me/mailFolders/sentitems/messages')
      .top(50)
      .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,attachments')
      .expand('attachments')
      .get();
    
    for (const message of sentResponse.value) {
      await this.saveEmail(message);
    }
  }
  
  private async saveEmail(message: any): Promise<void> {
    if (!this.accountId) return;
    
    // Extract unsubscribe link from headers if available
    let unsubscribeLink = null;
    const headers = message.internetMessageHeaders || [];
    const unsubHeader = headers.find((h: any) => h.name?.toLowerCase() === 'list-unsubscribe');
    if (unsubHeader?.value) {
      const match = unsubHeader.value.match(/<(https?:\/\/[^>]+)>/);
      if (match) {
        unsubscribeLink = match[1];
      }
    }
    
    const attachments = (message.attachments || []).map((att: any) => ({
      id: att.id,
      filename: att.name,
      mimeType: att.contentType,
      size: att.size,
    }));
    
    const email = {
      id: nanoid(),
      accountId: this.accountId,
      messageId: message.id,
      threadId: message.conversationId,
      from: message.from?.emailAddress?.address || '',
      fromName: message.from?.emailAddress?.name || '',
      to: (message.toRecipients || []).map((r: any) => r.emailAddress?.address),
      cc: (message.ccRecipients || []).map((r: any) => r.emailAddress?.address),
      subject: message.subject || '',
      snippet: message.bodyPreview || '',
      body: message.body?.contentType === 'text' ? message.body?.content : '',
      bodyHtml: message.body?.contentType === 'html' ? message.body?.content : '',
      date: message.receivedDateTime,
      isRead: message.isRead,
      isStarred: message.flag?.flagStatus === 'flagged',
      labels: [],
      category: 'uncategorized',
      importance: 0.5,
      attachments,
      unsubscribeLink,
      hasUnsubscribe: !!unsubscribeLink,
    };
    
    this.db.saveEmail(email);
  }
  
  private async refreshTokenIfNeeded(): Promise<void> {
    const account = this.db.getAccount(this.accountId!);
    if (!account) return;
    
    const expiry = parseInt(account.tokenExpiry || '0');
    if (expiry && expiry < Date.now()) {
      const tokenResponse = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: this.refreshToken!,
          grant_type: 'refresh_token',
        }).toString(),
      });
      
      const tokens = await tokenResponse.json();
      
      if (!tokens.error) {
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token || this.refreshToken;
        this.initGraphClient();
        
        this.db.updateAccount(this.accountId!, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || this.refreshToken,
          tokenExpiry: (Date.now() + tokens.expires_in * 1000).toString(),
        });
      }
    }
  }
  
  async archiveEmail(emailId: string): Promise<void> {
    if (!this.graphClient) throw new Error('Outlook not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    // Move to archive folder
    await this.graphClient
      .api(`/me/messages/${email.messageId}/move`)
      .post({ destinationId: 'archive' });
  }
  
  async deleteEmail(emailId: string): Promise<void> {
    if (!this.graphClient) throw new Error('Outlook not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    await this.graphClient
      .api(`/me/messages/${email.messageId}`)
      .delete();
  }
  
  async moveEmail(emailId: string, folder: string): Promise<void> {
    if (!this.graphClient) throw new Error('Outlook not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    // Get or create folder
    let folderId: string;
    try {
      const foldersResponse = await this.graphClient
        .api('/me/mailFolders')
        .filter(`displayName eq '${folder}'`)
        .get();
      
      if (foldersResponse.value.length > 0) {
        folderId = foldersResponse.value[0].id;
      } else {
        const newFolder = await this.graphClient
          .api('/me/mailFolders')
          .post({ displayName: folder });
        folderId = newFolder.id;
      }
    } catch {
      return;
    }
    
    await this.graphClient
      .api(`/me/messages/${email.messageId}/move`)
      .post({ destinationId: folderId });
  }
  
  async markRead(emailId: string, read: boolean): Promise<void> {
    if (!this.graphClient) throw new Error('Outlook not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    await this.graphClient
      .api(`/me/messages/${email.messageId}`)
      .patch({ isRead: read });
  }
  
  async getUnsubscribeLink(emailId: string): Promise<string | null> {
    const email = this.db.getEmail(emailId);
    return email?.unsubscribeLink || null;
  }
}

