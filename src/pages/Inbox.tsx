import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mail,
  MailOpen,
  Star,
  Archive,
  Trash2,
  Tag,
  ChevronRight,
  Paperclip,
  X,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { useStore, Email } from '../store';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

const categoryColors: Record<string, string> = {
  financial: '#10b981',
  hr: '#8b5cf6',
  marketing: '#f59e0b',
  important: '#ef4444',
  social: '#06b6d4',
  shopping: '#ec4899',
  travel: '#14b8a6',
  bills: '#f97316',
  uncategorized: '#64748b',
};

export default function Inbox() {
  const {
    emails,
    loadEmails,
    selectedEmailId,
    selectEmail,
    markEmailsRead,
    archiveEmails,
    deleteEmails,
    categories,
    selectedCategory,
    selectCategory,
    isLoading,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEmails({ category: selectedCategory || undefined });
  }, [loadEmails, selectedCategory]);

  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    );
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  const formatEmailDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const handleSelectEmail = (emailId: string) => {
    if (selectedEmails.has(emailId)) {
      const next = new Set(selectedEmails);
      next.delete(emailId);
      setSelectedEmails(next);
    } else {
      setSelectedEmails(new Set([...selectedEmails, emailId]));
    }
  };

  const handleBulkAction = async (action: 'read' | 'unread' | 'archive' | 'delete') => {
    const ids = Array.from(selectedEmails);
    if (ids.length === 0) return;

    switch (action) {
      case 'read':
        await markEmailsRead(ids, true);
        break;
      case 'unread':
        await markEmailsRead(ids, false);
        break;
      case 'archive':
        await archiveEmails(ids);
        break;
      case 'delete':
        await deleteEmails(ids);
        break;
    }
    setSelectedEmails(new Set());
  };

  return (
    <div className="h-full flex">
      {/* Email List */}
      <div className="w-[400px] flex flex-col border-r border-surface-800/50 bg-surface-900/30">
        {/* Search & Filters */}
        <div className="p-4 border-b border-surface-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                rounded-lg text-sm text-surface-200 placeholder:text-surface-500
                focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => selectCategory(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                ${!selectedCategory
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-surface-800/50 text-surface-400 hover:bg-surface-700/50'
                }`}
            >
              All
            </button>
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                  ${selectedCategory === cat.id
                    ? 'text-white'
                    : 'bg-surface-800/50 text-surface-400 hover:bg-surface-700/50'
                  }`}
                style={{
                  backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedEmails.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-surface-800/50 overflow-hidden"
            >
              <div className="p-3 flex items-center gap-2">
                <span className="text-sm text-surface-400">
                  {selectedEmails.size} selected
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => handleBulkAction('read')}
                  className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                  title="Mark as read"
                >
                  <MailOpen className="w-4 h-4 text-surface-400" />
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive className="w-4 h-4 text-surface-400" />
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                <button
                  onClick={() => setSelectedEmails(new Set())}
                  className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-surface-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-surface-800/30 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-700" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-surface-700 rounded" />
                      <div className="h-3 w-48 bg-surface-700 rounded mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Mail className="w-12 h-12 text-surface-600 mb-4" />
              <p className="text-surface-400">No emails found</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-800/30">
              {filteredEmails.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`email-item p-4 cursor-pointer group relative
                    ${selectedEmailId === email.id ? 'bg-primary-500/5' : ''}
                    ${!email.isRead ? 'bg-surface-800/20' : ''}`}
                  onClick={() => {
                    selectEmail(email.id);
                    if (!email.isRead) {
                      markEmailsRead([email.id], true);
                    }
                  }}
                >
                  {/* Selection Checkbox */}
                  <div
                    className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                      transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEmail(email.id);
                    }}
                  >
                    {selectedEmails.has(email.id) ? (
                      <CheckCircle className="w-5 h-5 text-primary-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-surface-500 hover:text-surface-300" />
                    )}
                  </div>

                  <div className="flex items-start gap-3 pl-4 group-hover:pl-8 transition-all">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${categoryColors[email.category]}20` }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: categoryColors[email.category] }}
                      >
                        {(email.fromName || email.from).charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-surface-100' : 'text-surface-300'}`}>
                          {email.fromName || email.from}
                        </p>
                        <span className="text-xs text-surface-500 flex-shrink-0">
                          {formatEmailDate(email.date)}
                        </span>
                      </div>

                      <p className={`text-sm truncate mt-0.5 ${!email.isRead ? 'text-surface-200' : 'text-surface-400'}`}>
                        {email.subject}
                      </p>

                      <p className="text-xs text-surface-500 truncate mt-1">
                        {email.snippet}
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: `${categoryColors[email.category]}20`,
                            color: categoryColors[email.category],
                          }}
                        >
                          {email.category}
                        </span>
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="w-3.5 h-3.5 text-surface-500" />
                        )}
                        {email.isStarred && (
                          <Star className="w-3.5 h-3.5 text-accent-amber fill-accent-amber" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-surface-950/50">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-surface-800/50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${categoryColors[selectedEmail.category]}20` }}
                  >
                    <span
                      className="text-lg font-medium"
                      style={{ color: categoryColors[selectedEmail.category] }}
                    >
                      {(selectedEmail.fromName || selectedEmail.from).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-display font-semibold text-surface-100">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-surface-300">
                        {selectedEmail.fromName || selectedEmail.from}
                      </p>
                      <span className="text-surface-600">•</span>
                      <p className="text-sm text-surface-500">
                        {format(new Date(selectedEmail.date), 'PPpp')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
                    <Archive className="w-5 h-5 text-surface-400" />
                  </button>
                  <button className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
                    <Tag className="w-5 h-5 text-surface-400" />
                  </button>
                  <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Category & Labels */}
              <div className="flex items-center gap-2 mt-4">
                <span
                  className="px-3 py-1 text-sm rounded-full"
                  style={{
                    backgroundColor: `${categoryColors[selectedEmail.category]}20`,
                    color: categoryColors[selectedEmail.category],
                  }}
                >
                  {selectedEmail.category}
                </span>
                {selectedEmail.importance >= 0.7 && (
                  <span className="px-3 py-1 text-sm rounded-full bg-accent-rose/10 text-accent-rose">
                    Important
                  </span>
                )}
                {selectedEmail.hasUnsubscribe && (
                  <button className="px-3 py-1 text-sm rounded-full bg-surface-800 text-surface-400 
                    hover:text-surface-200 hover:bg-surface-700 transition-colors">
                    Unsubscribe
                  </button>
                )}
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-auto p-6">
              {selectedEmail.bodyHtml ? (
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <pre className="text-sm text-surface-300 whitespace-pre-wrap font-sans">
                  {selectedEmail.body || selectedEmail.snippet}
                </pre>
              )}
            </div>

            {/* Attachments */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="p-4 border-t border-surface-800/50">
                <p className="text-sm text-surface-400 mb-2">
                  Attachments ({selectedEmail.attachments.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-800/50 
                        rounded-lg hover:bg-surface-700/50 cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-300">{att.filename}</span>
                      <span className="text-xs text-surface-500">
                        {(att.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="w-16 h-16 text-surface-700 mx-auto mb-4" />
              <p className="text-surface-500">Select an email to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

