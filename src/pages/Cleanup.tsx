import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Copy,
  MailX,
  Megaphone,
  Paperclip,
  ShoppingCart,
  Newspaper,
  Trash2,
  Archive,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useStore, CleanupSuggestion } from '../store';

const suggestionIcons: Record<string, any> = {
  duplicate: Copy,
  inactive_subscription: MailX,
  spam: Megaphone,
  large_attachment: Paperclip,
  old_transactional: ShoppingCart,
  unread_newsletters: Newspaper,
};

const priorityColors = {
  high: 'text-accent-rose bg-accent-rose/10',
  medium: 'text-accent-amber bg-accent-amber/10',
  low: 'text-accent-cyan bg-accent-cyan/10',
};

export default function Cleanup() {
  const { cleanupSuggestions, loadCleanupSuggestions, executeCleanup, isLoading } = useStore();
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCleanupSuggestions();
  }, [loadCleanupSuggestions]);

  const handleExecute = async (suggestion: CleanupSuggestion) => {
    setExecutingAction(suggestion.id);
    
    try {
      let actionType = 'archive';
      if (suggestion.type === 'inactive_subscription') {
        actionType = 'unsubscribe';
      } else if (suggestion.type === 'duplicate') {
        actionType = 'delete';
      }
      
      await executeCleanup({
        type: actionType,
        emailIds: suggestion.emailIds,
      });
      
      setCompletedActions(new Set([...completedActions, suggestion.id]));
    } finally {
      setExecutingAction(null);
    }
  };

  const estimatedCleanup = cleanupSuggestions.reduce(
    (sum, s) => sum + s.emailIds.length, 0
  );

  const estimatedSpace = cleanupSuggestions.reduce(
    (sum, s) => sum + (s.estimatedSpace || 0), 0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Smart Cleanup
          </h1>
          <p className="text-surface-500 mt-1">
            AI-powered suggestions to keep your inbox clean and organized
          </p>
        </div>
        
        <button
          onClick={() => loadCleanupSuggestions()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20
            text-primary-400 rounded-lg transition-colors"
        >
          <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
          Refresh Suggestions
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-emerald/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-accent-emerald" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Cleanup Opportunities</p>
              <p className="text-2xl font-display font-semibold text-surface-100">
                {cleanupSuggestions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-violet/10 flex items-center justify-center">
              <Archive className="w-6 h-6 text-accent-violet" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Emails to Clean</p>
              <p className="text-2xl font-display font-semibold text-surface-100">
                {estimatedCleanup.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-amber/10 flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-accent-amber" />
            </div>
            <div>
              <p className="text-surface-500 text-sm">Space to Reclaim</p>
              <p className="text-2xl font-display font-semibold text-surface-100">
                {estimatedSpace > 1024 * 1024 * 1024
                  ? `${(estimatedSpace / (1024 * 1024 * 1024)).toFixed(1)} GB`
                  : estimatedSpace > 1024 * 1024
                  ? `${(estimatedSpace / (1024 * 1024)).toFixed(1)} MB`
                  : `${(estimatedSpace / 1024).toFixed(1)} KB`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-medium text-surface-100">
          Cleanup Suggestions
        </h2>

        {isLoading && cleanupSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
            <p className="text-surface-400 mt-3">Analyzing your inbox...</p>
          </div>
        ) : cleanupSuggestions.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-emerald/10 
              flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-accent-emerald" />
            </div>
            <h3 className="text-lg font-display font-medium text-surface-100">
              Your inbox is clean!
            </h3>
            <p className="text-surface-400 mt-2 max-w-md mx-auto">
              No cleanup suggestions at this time. Keep up the great inbox management!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {cleanupSuggestions.map((suggestion, index) => {
                const Icon = suggestionIcons[suggestion.type] || Sparkles;
                const isExecuting = executingAction === suggestion.id;
                const isCompleted = completedActions.has(suggestion.id);

                if (isCompleted) return null;

                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-5 hover:shadow-glow transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${suggestion.type === 'duplicate' ? '#f43f5e' : '#8b5cf6'}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: suggestion.type === 'duplicate' ? '#f43f5e' : '#8b5cf6' }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-surface-100">
                            {suggestion.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[suggestion.priority]}`}>
                            {suggestion.priority}
                          </span>
                        </div>

                        <p className="text-surface-400 mt-1">
                          {suggestion.description}
                        </p>

                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-sm text-surface-500">
                            {suggestion.emailIds.length} emails
                          </span>
                          {suggestion.estimatedSpace && (
                            <span className="text-sm text-surface-500">
                              {suggestion.estimatedSpace > 1024 * 1024
                                ? `${(suggestion.estimatedSpace / (1024 * 1024)).toFixed(1)} MB`
                                : `${(suggestion.estimatedSpace / 1024).toFixed(1)} KB`}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecute(suggestion)}
                        disabled={isExecuting}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400
                          text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {suggestion.action}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* One-Click Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-display font-medium text-surface-100 mb-2">
            Bulk Unsubscribe
          </h3>
          <p className="text-surface-400 text-sm mb-4">
            Unsubscribe from all identified marketing emails and newsletters in one click.
          </p>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent-rose/10 
            hover:bg-accent-rose/20 text-accent-rose rounded-lg transition-colors">
            <MailX className="w-4 h-4" />
            Unsubscribe from All
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-display font-medium text-surface-100 mb-2">
            Archive Old Emails
          </h3>
          <p className="text-surface-400 text-sm mb-4">
            Archive transactional emails and receipts older than 1 year.
          </p>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent-violet/10 
            hover:bg-accent-violet/20 text-accent-violet rounded-lg transition-colors">
            <Archive className="w-4 h-4" />
            Archive Old Emails
          </button>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-surface-400">
            <strong className="text-surface-300">Privacy First:</strong> All cleanup analysis 
            happens locally on your device. No email content is ever sent to external servers.
            When unsubscribing, links are opened in your default browser.
          </p>
        </div>
      </div>
    </div>
  );
}

