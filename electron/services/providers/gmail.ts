import { google, gmail_v1 } from 'googleapis';
import { BrowserWindow } from 'electron';
import { DatabaseService } from '../database';
import { EmailProvider } from './provider-manager';
import { nanoid } from 'nanoid';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// OAuth credentials - Set these environment variables before running:
// GMAIL_CLIENT_ID - Get from Google Cloud Console (https://console.cloud.google.com)
// GMAIL_CLIENT_SECRET - Get from Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:8234/oauth/callback';

export class GmailProvider implements EmailProvider {
  private db: DatabaseService;
  private oauth2Client: any;
  private gmail: gmail_v1.Gmail | null = null;
  private accountId: string | null = null;
  
  constructor(db: DatabaseService, config?: any) {
    this.db = db;
    
    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    
    if (config?.accessToken) {
      this.oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
      });
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }
  }
  
  async authenticate(): Promise<{ success: boolean; account?: any; error?: string }> {
    return new Promise((resolve) => {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent',
      });
      
      // Create auth window
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      
      // Start local server to handle callback
      const http = require('http');
      const url = require('url');
      
      const server = http.createServer(async (req: any, res: any) => {
        const query = url.parse(req.url, true).query;
        
        if (query.code) {
          try {
            const { tokens } = await this.oauth2Client.getToken(query.code);
            this.oauth2Client.setCredentials(tokens);
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            
            // Get user info
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            
            // Create account in database
            const account = this.db.createAccount({
              email: userInfo.data.email!,
              provider: 'gmail',
              name: userInfo.data.name,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiry: tokens.expiry_date?.toString(),
            });
            
            this.accountId = account.id;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
                  <div style="text-align: center;">
                    <h1>✓ Gmail Connected</h1>
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
      
      server.listen(8234, () => {
        authWindow.loadURL(authUrl);
      });
      
      authWindow.on('closed', () => {
        server.close();
      });
    });
  }
  
  async syncEmails(accountId: string): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not authenticated');
    
    this.accountId = accountId;
    
    // Refresh token if needed
    await this.refreshTokenIfNeeded();
    
    // Get list of messages
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      q: 'in:inbox OR in:sent',
    });
    
    const messages = response.data.messages || [];
    
    for (const msg of messages) {
      await this.fetchAndSaveEmail(msg.id!);
    }
  }
  
  private async fetchAndSaveEmail(messageId: string): Promise<void> {
    if (!this.gmail || !this.accountId) return;
    
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      
      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const getHeader = (name: string): string => {
        const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };
      
      // Parse email body
      let body = '';
      let bodyHtml = '';
      
      const extractBody = (part: any): void => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
          part.parts.forEach(extractBody);
        }
      };
      
      extractBody(message.payload);
      
      // Extract attachments
      const attachments: any[] = [];
      const extractAttachments = (part: any): void => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
          });
        }
        if (part.parts) {
          part.parts.forEach(extractAttachments);
        }
      };
      
      extractAttachments(message.payload);
      
      // Check for unsubscribe header
      const unsubscribeHeader = getHeader('List-Unsubscribe');
      let unsubscribeLink = null;
      if (unsubscribeHeader) {
        const match = unsubscribeHeader.match(/<(https?:\/\/[^>]+)>/);
        if (match) {
          unsubscribeLink = match[1];
        }
      }
      
      // Parse from address
      const fromHeader = getHeader('From');
      const fromMatch = fromHeader.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
      const fromName = fromMatch?.[1] || '';
      const fromAddress = fromMatch?.[2] || fromHeader;
      
      // Parse to addresses
      const toHeader = getHeader('To');
      const toAddresses = toHeader.split(',').map(addr => {
        const match = addr.match(/<?([^>]+@[^>]+)>?/);
        return match?.[1] || addr.trim();
      });
      
      const email = {
        id: nanoid(),
        accountId: this.accountId,
        messageId: message.id!,
        threadId: message.threadId,
        from: fromAddress,
        fromName,
        to: toAddresses,
        cc: getHeader('Cc').split(',').filter(Boolean),
        subject: getHeader('Subject'),
        snippet: message.snippet || '',
        body,
        bodyHtml,
        date: new Date(parseInt(message.internalDate!)).toISOString(),
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        labels: message.labelIds || [],
        category: 'uncategorized',
        importance: 0.5,
        attachments,
        size: message.sizeEstimate,
        unsubscribeLink,
        hasUnsubscribe: !!unsubscribeLink,
      };
      
      this.db.saveEmail(email);
    } catch (error) {
      console.error(`Failed to fetch email ${messageId}:`, error);
    }
  }
  
  private async refreshTokenIfNeeded(): Promise<void> {
    const credentials = this.oauth2Client.credentials;
    
    if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
      const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(newCredentials);
      
      if (this.accountId) {
        this.db.updateAccount(this.accountId, {
          accessToken: newCredentials.access_token,
          tokenExpiry: newCredentials.expiry_date?.toString(),
        });
      }
    }
  }
  
  async archiveEmail(emailId: string): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: email.messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });
  }
  
  async deleteEmail(emailId: string): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    await this.gmail.users.messages.trash({
      userId: 'me',
      id: email.messageId,
    });
  }
  
  async moveEmail(emailId: string, folder: string): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    // Get or create label
    const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' });
    let label = labelsResponse.data.labels?.find(l => l.name === folder);
    
    if (!label) {
      const createResponse = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: folder },
      });
      label = createResponse.data;
    }
    
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: email.messageId,
      requestBody: {
        addLabelIds: [label.id!],
        removeLabelIds: ['INBOX'],
      },
    });
  }
  
  async markRead(emailId: string, read: boolean): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not authenticated');
    
    const email = this.db.getEmail(emailId);
    if (!email) return;
    
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: email.messageId,
      requestBody: read
        ? { removeLabelIds: ['UNREAD'] }
        : { addLabelIds: ['UNREAD'] },
    });
  }
  
  async getUnsubscribeLink(emailId: string): Promise<string | null> {
    const email = this.db.getEmail(emailId);
    return email?.unsubscribeLink || null;
  }
}

