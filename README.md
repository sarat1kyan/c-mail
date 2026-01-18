# C-Mail Intelligence

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/sarat1kyan/c-mail)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/sarat1kyan/c-mail/releases)
[![Privacy](https://img.shields.io/badge/privacy-local--first-green.svg)](#-privacy-first-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/sarat1kyan/c-mail.svg)](https://github.com/sarat1kyan/c-mail/issues)
[![GitHub stars](https://img.shields.io/github/stars/sarat1kyan/c-mail.svg)](https://github.com/sarat1kyan/c-mail/stargazers)

A **locally-executable** email intelligence and automation tool with powerful categorization, cleanup, and rule engines. All processing happens on your device for maximum privacy.

<p align="center">
  <img src="docs/dashboard.png" alt="Dashboard Preview" width="800">
</p>

## ✨ Features

### 📊 Executive Dashboard
- Real-time email analytics and trends
- Category distribution visualizations
- Critical emails requiring attention
- Sender importance scoring
- Time-of-day activity analysis

### 🏷️ AI-Powered Categorization
Automatically classify emails into intelligent categories:
- **Financial** - Banks, credit cards, investments
- **HR/Recruitment** - Job offers, applications, interviews
- **Marketing/Ads** - Promotions, newsletters, advertisements
- **Important** - Critical communications requiring attention
- **Social** - LinkedIn, social media notifications
- **Shopping** - Orders, receipts, shipping updates
- **Travel** - Flight bookings, hotel reservations
- **Bills/Invoices** - Utility bills, payment reminders

### 🧹 Smart Cleanup System
- Identify duplicate emails and newsletters
- Detect inactive subscriptions (90+ days)
- Find large attachments consuming space
- Bulk unsubscribe from promotions
- One-click cleanup actions

### ⚡ Automation Rules
- AI-suggested rules based on email patterns
- Create custom rules with conditions and actions
- Cross-provider rule synchronization
- Test rules before enabling

### 🔐 Privacy-First Architecture
- **100% local processing** - No cloud analysis
- **Encrypted database** - Optional SQLite encryption
- **OAuth authentication** - Secure provider connections
- **No data collection** - Your emails stay yours

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/sarat1kyan/c-mail.git
cd c-mail

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building for Production

```bash
# Build for your platform
npm run build

# Or build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 🔧 Configuration

### Email Provider Setup

#### Gmail
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project and enable Gmail API
3. Create OAuth 2.0 credentials
4. Set environment variables:
   ```
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   ```

#### Outlook/Microsoft 365
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Configure API permissions for Microsoft Graph
4. Set environment variables:
   ```
   OUTLOOK_CLIENT_ID=your_client_id
   OUTLOOK_CLIENT_SECRET=your_client_secret
   ```

#### IMAP (Other Providers)
Connect any email provider via IMAP with:
- IMAP server address
- Port (usually 993 for SSL)
- Email and app-specific password

## 💻 CLI Usage

C-Mail includes a powerful command-line interface:

```bash
# Show status
npm run cli status

# View category breakdown
npm run cli categories

# Generate executive summary
npm run cli summary --period week

# Search emails
npm run cli search "invoice" --category bills --limit 20

# List automation rules
npm run cli rules

# Show cleanup suggestions
npm run cli cleanup

# Export data
npm run cli export --type rules --format json --output rules.json

# View detailed statistics
npm run cli stats
```

## 📁 Project Structure

```
c-mail/
├── electron/                 # Electron main process
│   ├── main.ts              # Main entry point
│   ├── preload.ts           # Preload script with IPC
│   └── services/            # Backend services
│       ├── database.ts      # SQLite database
│       ├── classifier.ts    # Email categorization
│       ├── analytics.ts     # Analytics engine
│       ├── cleanup.ts       # Cleanup suggestions
│       ├── rules-engine.ts  # Automation rules
│       └── providers/       # Email providers
│           ├── gmail.ts
│           ├── outlook.ts
│           └── imap.ts
├── src/                     # React frontend
│   ├── App.tsx
│   ├── store/               # Zustand state management
│   ├── pages/               # Page components
│   └── components/          # Shared components
├── cli/                     # CLI interface
│   └── index.ts
└── ...
```

## 🎨 UI Features

- **Dark theme** with sophisticated color palette
- **Smooth animations** with Framer Motion
- **Responsive charts** with Chart.js
- **Custom window controls** (frameless window)
- **Collapsible sidebar** for more screen space

## 🔒 Security Features

- OAuth 2.0 for Gmail and Outlook
- Credentials stored securely in encrypted SQLite
- No email content sent to external servers
- Optional database encryption
- App-specific passwords for IMAP

## 📈 Analytics Capabilities

- Email volume trends over time
- Category distribution charts
- Time-of-day activity analysis
- Sender importance scoring
- Response time metrics
- Topic trend analysis

## 🛠️ Technical Stack

- **Framework**: Electron + React + TypeScript
- **UI**: Tailwind CSS + Framer Motion
- **Charts**: Chart.js + react-chartjs-2
- **Database**: SQLite with sql.js (WebAssembly)
- **State Management**: Zustand
- **Email Processing**: IMAP, Gmail API, Microsoft Graph
- **NLP**: Local pattern matching (privacy-focused)

## 📋 Roadmap

- [ ] Calendar integration for email-to-event conversion
- [ ] Smart reply suggestions
- [ ] Email templates
- [ ] Multi-language support
- [ ] Mobile companion app
- [ ] Plugin system for extensions

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev)
- Fonts: IBM Plex Sans, JetBrains Mono, Outfit

---

<p align="center">
  <strong>Built with privacy in mind ❤️</strong>
</p>

