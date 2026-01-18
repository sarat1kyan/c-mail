import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  Briefcase,
  Megaphone,
  Star,
  Users,
  ShoppingCart,
  Plane,
  FileText,
  Inbox,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useStore } from '../store';

const categoryIcons: Record<string, any> = {
  financial: Landmark,
  hr: Briefcase,
  marketing: Megaphone,
  important: Star,
  social: Users,
  shopping: ShoppingCart,
  travel: Plane,
  bills: FileText,
  uncategorized: Inbox,
};

const categoryDescriptions: Record<string, string> = {
  financial: 'Banks, credit cards, investments, and financial statements',
  hr: 'Job offers, applications, interviews, and corporate HR communications',
  marketing: 'Promotions, newsletters, advertisements, and marketing emails',
  important: 'Critical communications that require your attention',
  social: 'LinkedIn, social media updates, and network notifications',
  shopping: 'Order confirmations, shipping updates, and receipts',
  travel: 'Flight bookings, hotel reservations, and travel itineraries',
  bills: 'Invoices, utility bills, and payment reminders',
  uncategorized: 'Emails that haven\'t been categorized yet',
};

export default function Categories() {
  const { categories, loadCategories, selectCategory } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCategoryClick = (categoryId: string) => {
    selectCategory(categoryId);
    navigate('/inbox');
  };

  const totalEmails = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-surface-100">
          Email Categories
        </h1>
        <p className="text-surface-500 mt-1">
          AI-powered email categorization for intelligent inbox management
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-surface-500 text-sm">Total Categories</p>
          <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
            {categories.length}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-surface-500 text-sm">Total Emails</p>
          <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
            {totalEmails.toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-surface-500 text-sm">Categorized</p>
          <p className="text-3xl font-display font-semibold text-surface-100 mt-1">
            {totalEmails > 0
              ? Math.round(((totalEmails - (categories.find(c => c.id === 'uncategorized')?.count || 0)) / totalEmails) * 100)
              : 0}%
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-surface-500 text-sm">Top Category</p>
          <p className="text-xl font-display font-semibold text-surface-100 mt-1 capitalize">
            {categories[0]?.name || '—'}
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category, index) => {
          const Icon = categoryIcons[category.id] || Inbox;
          const percentage = totalEmails > 0 
            ? Math.round((category.count / totalEmails) * 100) 
            : 0;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCategoryClick(category.id)}
              className="glass rounded-xl p-6 cursor-pointer group hover:shadow-glow 
                transition-all duration-300 hover:border-primary-500/20"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center
                    transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: category.color }} />
                </div>
                <ArrowRight 
                  className="w-5 h-5 text-surface-600 group-hover:text-primary-400 
                    group-hover:translate-x-1 transition-all" 
                />
              </div>

              <h3 className="text-lg font-display font-medium text-surface-100 mt-4">
                {category.name}
              </h3>
              
              <p className="text-sm text-surface-500 mt-1 line-clamp-2">
                {categoryDescriptions[category.id] || ''}
              </p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800/50">
                <div>
                  <p className="text-2xl font-display font-semibold text-surface-100">
                    {category.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-surface-500">emails</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {Math.random() > 0.5 ? (
                      <TrendingUp className="w-4 h-4 text-accent-emerald" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-accent-rose" />
                    )}
                    <span className="text-sm font-medium text-surface-300">
                      {percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-surface-500">of inbox</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Classification Info */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-display font-medium text-surface-100">
              AI-Powered Classification
            </h3>
            <p className="text-surface-400 mt-1">
              Emails are automatically categorized using local NLP processing. 
              All classification happens on your device for maximum privacy.
              The AI learns from your corrections to improve accuracy over time.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-emerald" />
                <span className="text-sm text-surface-400">Pattern matching</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-violet" />
                <span className="text-sm text-surface-400">Keyword analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-cyan" />
                <span className="text-sm text-surface-400">Sender recognition</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

