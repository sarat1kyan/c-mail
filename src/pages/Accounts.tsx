import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStore, Account } from '../store';
import { formatDistanceToNow } from 'date-fns';

const providers = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect your Google account',
    icon: '📧',
    color: '#EA4335',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    description: 'Connect your Microsoft account',
    icon: '📬',
    color: '#0078D4',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'imap',
    name: 'Other (IMAP)',
    description: 'Connect any email via IMAP',
    icon: '📮',
    color: '#64748b',
    bgColor: 'bg-surface-500/10',
  },
];

export default function Accounts() {
  const { 
    accounts, 
    loadAccounts, 
    addAccount, 
    removeAccount, 
    syncAccounts,
    isSyncing 
  } = useStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [imapConfig, setImapConfig] = useState({
    host: '',
    port: '993',
    email: '',
    password: '',
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleConnectProvider = async (providerId: string) => {
    if (providerId === 'imap') {
      setSelectedProvider('imap');
      return;
    }
    
    setIsConnecting(true);
    try {
      await addAccount(providerId);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectIMAP = async () => {
    setIsConnecting(true);
    try {
      // This would pass IMAP config to the backend
      // await addAccount('imap', imapConfig);
      setShowAddModal(false);
      setSelectedProvider(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(p => p.id === providerId) || providers[2];
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Email Accounts
          </h1>
          <p className="text-surface-500 mt-1">
            Manage your connected email accounts
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400
            text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Connected Accounts */}
      {accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-12 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-500/10 
            flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-xl font-display font-semibold text-surface-100">
            No accounts connected
          </h2>
          <p className="text-surface-400 mt-2 max-w-md mx-auto">
            Connect your email accounts to start using intelligent email management,
            automatic categorization, and powerful cleanup tools.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 
              bg-primary-500 hover:bg-primary-400 text-white font-medium 
              rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Account
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account, index) => {
            const provider = getProviderInfo(account.provider);
            
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl ${provider.bgColor} 
                      flex items-center justify-center text-2xl`}
                  >
                    {provider.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-surface-100">
                        {account.name || account.email}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-accent-emerald/10 
                        text-accent-emerald flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    </div>
                    <p className="text-surface-400 mt-0.5">{account.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: provider.color }}
                        />
                        {provider.name}
                      </span>
                      {account.lastSync && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Synced {formatDistanceToNow(new Date(account.lastSync), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => syncAccounts(account.id)}
                      disabled={isSyncing}
                      className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                      title="Sync now"
                    >
                      <RefreshCw className={`w-5 h-5 text-surface-400 
                        ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this account?')) {
                          removeAccount(account.id);
                        }
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove account"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center 
              bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              setSelectedProvider(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass rounded-2xl p-6 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-surface-100">
                  {selectedProvider === 'imap' ? 'Connect via IMAP' : 'Add Email Account'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedProvider(null);
                  }}
                  className="p-2 hover:bg-surface-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-surface-400" />
                </button>
              </div>

              {selectedProvider === 'imap' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      IMAP Server
                    </label>
                    <input
                      type="text"
                      value={imapConfig.host}
                      onChange={(e) => setImapConfig({ ...imapConfig, host: e.target.value })}
                      placeholder="imap.example.com"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                        rounded-lg text-surface-200 placeholder:text-surface-500
                        focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Port
                    </label>
                    <input
                      type="text"
                      value={imapConfig.port}
                      onChange={(e) => setImapConfig({ ...imapConfig, port: e.target.value })}
                      placeholder="993"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                        rounded-lg text-surface-200 placeholder:text-surface-500
                        focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={imapConfig.email}
                      onChange={(e) => setImapConfig({ ...imapConfig, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                        rounded-lg text-surface-200 placeholder:text-surface-500
                        focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Password / App Password
                    </label>
                    <input
                      type="password"
                      value={imapConfig.password}
                      onChange={(e) => setImapConfig({ ...imapConfig, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                        rounded-lg text-surface-200 placeholder:text-surface-500
                        focus:outline-none focus:border-primary-500/50"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/50">
                    <div className="flex items-center gap-2 text-accent-amber">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Security Note</span>
                    </div>
                    <p className="text-sm text-surface-400 mt-1">
                      Your credentials are stored securely on your device and never sent 
                      to any external servers.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="px-4 py-2 text-surface-400 hover:text-surface-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConnectIMAP}
                      disabled={isConnecting || !imapConfig.host || !imapConfig.email}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                        bg-primary-500 hover:bg-primary-400 text-white font-medium 
                        rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleConnectProvider(provider.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 p-4 rounded-xl
                        border border-surface-700 hover:border-primary-500/50 
                        hover:bg-primary-500/5 transition-all text-left group"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl ${provider.bgColor} 
                          flex items-center justify-center text-2xl
                          group-hover:scale-110 transition-transform`}
                      >
                        {provider.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-surface-200">{provider.name}</p>
                        <p className="text-sm text-surface-500">{provider.description}</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-surface-600 
                        group-hover:text-primary-400 transition-colors" />
                    </button>
                  ))}

                  {isConnecting && (
                    <div className="flex items-center justify-center gap-2 py-4 text-primary-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Note */}
      <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-accent-emerald flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-surface-200">Your data stays private</p>
            <p className="text-sm text-surface-400 mt-1">
              Email content is only stored locally on your device. We use OAuth for 
              secure authentication with Gmail and Outlook—we never see your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

