import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Settings,
  Filter,
  Tag,
  Archive,
  Mail,
  X,
} from 'lucide-react';
import { useStore, Rule, RuleCondition, RuleAction } from '../store';

const conditionFields = [
  { value: 'from', label: 'From' },
  { value: 'to', label: 'To' },
  { value: 'subject', label: 'Subject' },
  { value: 'body', label: 'Body' },
  { value: 'category', label: 'Category' },
  { value: 'hasAttachment', label: 'Has Attachment' },
];

const conditionOperators = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'regex', label: 'Matches regex' },
];

const actionTypes = [
  { value: 'move', label: 'Move to folder', icon: Archive },
  { value: 'categorize', label: 'Set category', icon: Tag },
  { value: 'markRead', label: 'Mark as read', icon: Mail },
  { value: 'archive', label: 'Archive', icon: Archive },
  { value: 'delete', label: 'Delete', icon: Trash2 },
];

export default function Rules() {
  const { rules, loadRules, createRule, updateRule, deleteRule } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Mock rule suggestions
  const ruleSuggestions = [
    {
      id: 'sug-1',
      name: 'Auto-categorize bank emails',
      conditions: [{ field: 'from', operator: 'contains', value: '@bankofamerica.com' }],
      actions: [{ type: 'categorize', value: 'financial' }],
      confidence: 0.95,
      reason: '45 emails from @bankofamerica.com are all in the financial category',
    },
    {
      id: 'sug-2',
      name: 'Archive old newsletters',
      conditions: [
        { field: 'category', operator: 'equals', value: 'marketing' },
        { field: 'from', operator: 'contains', value: 'newsletter' },
      ],
      actions: [{ type: 'archive' }],
      confidence: 0.88,
      reason: 'You rarely open newsletters older than 30 days',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Automation Rules
          </h1>
          <p className="text-surface-500 mt-1">
            Create intelligent rules to automatically organize your emails
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400
            text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && ruleSuggestions.length > 0 && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-accent-amber" />
              </div>
              <div>
                <h2 className="text-lg font-display font-medium text-surface-100">
                  AI-Suggested Rules
                </h2>
                <p className="text-sm text-surface-500">
                  Based on your email patterns
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-surface-500 hover:text-surface-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {ruleSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30
                  border border-surface-700/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-surface-200 font-medium">{suggestion.name}</p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full
                      bg-accent-emerald/10 text-accent-emerald">
                      {Math.round(suggestion.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-surface-500 mt-1">{suggestion.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      createRule({
                        name: suggestion.name,
                        conditions: suggestion.conditions as RuleCondition[],
                        actions: suggestion.actions as RuleAction[],
                      });
                    }}
                    className="px-3 py-1.5 text-sm bg-primary-500/10 hover:bg-primary-500/20
                      text-primary-400 rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button className="px-3 py-1.5 text-sm text-surface-500 hover:text-surface-300
                    hover:bg-surface-700 rounded-lg transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-medium text-surface-100">
            Active Rules ({rules.length})
          </h2>
        </div>

        {rules.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 
              flex items-center justify-center">
              <Zap className="w-8 h-8 text-surface-600" />
            </div>
            <h3 className="text-lg font-display font-medium text-surface-100">
              No rules yet
            </h3>
            <p className="text-surface-400 mt-2 max-w-md mx-auto">
              Create your first automation rule to start organizing emails automatically.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 
                bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 
                rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <motion.div
                key={rule.id}
                layout
                className="glass rounded-xl overflow-hidden"
              >
                {/* Rule Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-800/30
                    transition-colors"
                  onClick={() => setExpandedRuleId(
                    expandedRuleId === rule.id ? null : rule.id
                  )}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${rule.enabled ? 'bg-accent-emerald/10' : 'bg-surface-800'}`}>
                    <Zap className={`w-5 h-5 ${rule.enabled ? 'text-accent-emerald' : 'text-surface-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-surface-200">{rule.name}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full
                        ${rule.enabled 
                          ? 'bg-accent-emerald/10 text-accent-emerald' 
                          : 'bg-surface-700 text-surface-500'}`}>
                        {rule.enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}, 
                      {' '}{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                      {rule.hitCount ? ` • ${rule.hitCount} matches` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateRule(rule.id, { enabled: !rule.enabled });
                      }}
                      className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                    >
                      {rule.enabled ? (
                        <Pause className="w-4 h-4 text-surface-400" />
                      ) : (
                        <Play className="w-4 h-4 text-surface-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRule(rule.id);
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                    {expandedRuleId === rule.id ? (
                      <ChevronDown className="w-5 h-5 text-surface-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-surface-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedRuleId === rule.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-surface-800/50 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {/* Conditions */}
                        <div>
                          <p className="text-sm font-medium text-surface-400 mb-2">
                            If email matches:
                          </p>
                          <div className="space-y-2">
                            {rule.conditions.map((cond, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-3 rounded-lg bg-surface-800/30"
                              >
                                <Filter className="w-4 h-4 text-surface-500" />
                                <span className="text-surface-300 capitalize">{cond.field}</span>
                                <span className="text-surface-500">{cond.operator}</span>
                                <span className="text-primary-400">"{cond.value}"</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div>
                          <p className="text-sm font-medium text-surface-400 mb-2">
                            Then:
                          </p>
                          <div className="space-y-2">
                            {rule.actions.map((action, i) => {
                              const ActionIcon = actionTypes.find(a => a.value === action.type)?.icon || Zap;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 p-3 rounded-lg bg-surface-800/30"
                                >
                                  <ActionIcon className="w-4 h-4 text-accent-emerald" />
                                  <span className="text-surface-300 capitalize">{action.type}</span>
                                  {action.value && (
                                    <span className="text-accent-emerald">→ {action.value}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Stats */}
                        {rule.hitCount !== undefined && (
                          <div className="pt-3 border-t border-surface-800/50">
                            <p className="text-sm text-surface-500">
                              Matched {rule.hitCount} emails
                              {rule.lastHit && ` • Last match: ${new Date(rule.lastHit).toLocaleDateString()}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRuleModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(rule) => {
              createRule(rule);
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateRuleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (rule: { name: string; conditions: RuleCondition[]; actions: RuleAction[] }) => void;
}) {
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: 'from', operator: 'contains', value: '' },
  ]);
  const [actions, setActions] = useState<RuleAction[]>([
    { type: 'categorize', value: 'important' },
  ]);

  const addCondition = () => {
    setConditions([...conditions, { field: 'from', operator: 'contains', value: '' }]);
  };

  const addAction = () => {
    setActions([...actions, { type: 'markRead' }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, conditions, actions });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl glass rounded-2xl p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-surface-100">
            Create New Rule
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Move bank emails to Finance"
              className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700/50
                rounded-lg text-surface-200 placeholder:text-surface-500
                focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              When email matches
            </label>
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={cond.field}
                    onChange={(e) => {
                      const updated = [...conditions];
                      updated[i].field = e.target.value;
                      setConditions(updated);
                    }}
                    className="px-3 py-2 bg-surface-800/50 border border-surface-700/50
                      rounded-lg text-surface-200 focus:outline-none focus:border-primary-500/50"
                  >
                    {conditionFields.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const updated = [...conditions];
                      updated[i].operator = e.target.value;
                      setConditions(updated);
                    }}
                    className="px-3 py-2 bg-surface-800/50 border border-surface-700/50
                      rounded-lg text-surface-200 focus:outline-none focus:border-primary-500/50"
                  >
                    {conditionOperators.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => {
                      const updated = [...conditions];
                      updated[i].value = e.target.value;
                      setConditions(updated);
                    }}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 bg-surface-800/50 border border-surface-700/50
                      rounded-lg text-surface-200 placeholder:text-surface-500
                      focus:outline-none focus:border-primary-500/50"
                  />
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                      className="p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                + Add condition
              </button>
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Then do
            </label>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={action.type}
                    onChange={(e) => {
                      const updated = [...actions];
                      updated[i].type = e.target.value;
                      setActions(updated);
                    }}
                    className="px-3 py-2 bg-surface-800/50 border border-surface-700/50
                      rounded-lg text-surface-200 focus:outline-none focus:border-primary-500/50"
                  >
                    {actionTypes.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  {(action.type === 'move' || action.type === 'categorize') && (
                    <input
                      type="text"
                      value={action.value || ''}
                      onChange={(e) => {
                        const updated = [...actions];
                        updated[i].value = e.target.value;
                        setActions(updated);
                      }}
                      placeholder={action.type === 'move' ? 'Folder name' : 'Category'}
                      className="flex-1 px-3 py-2 bg-surface-800/50 border border-surface-700/50
                        rounded-lg text-surface-200 placeholder:text-surface-500
                        focus:outline-none focus:border-primary-500/50"
                    />
                  )}
                  {actions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActions(actions.filter((_, j) => j !== i))}
                      className="p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAction}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                + Add action
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-surface-400 hover:text-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-500 hover:bg-primary-400 text-white
                font-medium rounded-lg transition-colors"
            >
              Create Rule
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

