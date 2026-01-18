import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Trash2,
  Download,
  Upload,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Lock,
  Database,
  Save,
  Check,
} from 'lucide-react';
import { useStore, Settings as SettingsType } from '../store';

const themes = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function Settings() {
  const { settings, loadSettings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState<SettingsType | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (!localSettings) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-surface-100">
            Settings
          </h1>
          <p className="text-surface-500 mt-1">
            Configure your email intelligence preferences
          </p>
        </div>
        
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400
            text-white font-medium rounded-lg transition-colors"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Appearance */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-surface-400" />
          Appearance
        </h2>
        
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-3">
            Theme
          </label>
          <div className="flex gap-3">
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setLocalSettings({
                  ...localSettings,
                  theme: theme.value as any,
                })}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all
                  ${localSettings.theme === theme.value
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-surface-700 bg-surface-800/50 text-surface-400 hover:border-surface-600'
                  }`}
              >
                <theme.icon className="w-5 h-5" />
                {theme.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sync Settings */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-surface-400" />
          Sync
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Auto Sync</p>
              <p className="text-sm text-surface-500">
                Automatically sync emails in the background
              </p>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                autoSync: !localSettings.autoSync,
              })}
              className={`w-12 h-6 rounded-full transition-colors relative
                ${localSettings.autoSync ? 'bg-primary-500' : 'bg-surface-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${localSettings.autoSync ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Sync Interval</p>
              <p className="text-sm text-surface-500">
                How often to check for new emails
              </p>
            </div>
            <select
              value={localSettings.syncInterval}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                syncInterval: parseInt(e.target.value),
              })}
              className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg
                text-surface-200 focus:outline-none focus:border-primary-500/50"
            >
              <option value={1}>Every minute</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-surface-400" />
          Notifications
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Enable Notifications</p>
              <p className="text-sm text-surface-500">
                Show desktop notifications for new emails
              </p>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                notifications: {
                  ...localSettings.notifications,
                  enabled: !localSettings.notifications.enabled,
                },
              })}
              className={`w-12 h-6 rounded-full transition-colors relative
                ${localSettings.notifications.enabled ? 'bg-primary-500' : 'bg-surface-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${localSettings.notifications.enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Critical Emails Only</p>
              <p className="text-sm text-surface-500">
                Only notify for high-importance emails
              </p>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                notifications: {
                  ...localSettings.notifications,
                  critical: !localSettings.notifications.critical,
                },
              })}
              className={`w-12 h-6 rounded-full transition-colors relative
                ${localSettings.notifications.critical ? 'bg-primary-500' : 'bg-surface-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${localSettings.notifications.critical ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Sound</p>
              <p className="text-sm text-surface-500">
                Play sound for notifications
              </p>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                notifications: {
                  ...localSettings.notifications,
                  sound: !localSettings.notifications.sound,
                },
              })}
              className={`w-12 h-6 rounded-full transition-colors relative
                ${localSettings.notifications.sound ? 'bg-primary-500' : 'bg-surface-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${localSettings.notifications.sound ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Cleanup */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-surface-400" />
          Auto Cleanup
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Auto-archive After</p>
              <p className="text-sm text-surface-500">
                Automatically archive old emails
              </p>
            </div>
            <select
              value={localSettings.cleanup.autoArchiveAfterDays}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                cleanup: {
                  ...localSettings.cleanup,
                  autoArchiveAfterDays: parseInt(e.target.value),
                },
              })}
              className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg
                text-surface-200 focus:outline-none focus:border-primary-500/50"
            >
              <option value={0}>Never</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Delete Spam After</p>
              <p className="text-sm text-surface-500">
                Automatically delete old spam
              </p>
            </div>
            <select
              value={localSettings.cleanup.deleteSpamAfterDays}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                cleanup: {
                  ...localSettings.cleanup,
                  deleteSpamAfterDays: parseInt(e.target.value),
                },
              })}
              className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg
                text-surface-200 focus:outline-none focus:border-primary-500/50"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-surface-400" />
          Privacy & Security
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Local Processing Only</p>
              <p className="text-sm text-surface-500">
                All email analysis happens on your device
              </p>
            </div>
            <button
              disabled
              className="w-12 h-6 rounded-full bg-primary-500 relative cursor-not-allowed"
            >
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 left-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200">Encrypt Database</p>
              <p className="text-sm text-surface-500">
                Encrypt local email database
              </p>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                privacy: {
                  ...localSettings.privacy,
                  encryptDatabase: !localSettings.privacy.encryptDatabase,
                },
              })}
              className={`w-12 h-6 rounded-full transition-colors relative
                ${localSettings.privacy.encryptDatabase ? 'bg-primary-500' : 'bg-surface-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${localSettings.privacy.encryptDatabase ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-surface-800/30 border border-surface-700/50">
          <div className="flex items-center gap-2 text-accent-emerald mb-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Privacy First</span>
          </div>
          <p className="text-sm text-surface-400">
            Your email content never leaves your device. All classification, analysis,
            and cleanup processing happens locally using on-device AI.
          </p>
        </div>
      </section>

      {/* Data Management */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-display font-medium text-surface-100 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-surface-400" />
          Data Management
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 rounded-lg
            border border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5
            transition-colors">
            <Download className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Export Rules</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 rounded-lg
            border border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5
            transition-colors">
            <Upload className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Import Rules</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 rounded-lg
            border border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5
            transition-colors">
            <Download className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Export Data (JSON)</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 rounded-lg
            border border-surface-700 hover:border-primary-500/50 hover:bg-primary-500/5
            transition-colors">
            <Download className="w-5 h-5 text-surface-400" />
            <span className="text-surface-200">Export Data (CSV)</span>
          </button>
        </div>
      </section>

      {/* Version Info */}
      <div className="text-center text-surface-500 text-sm py-4">
        <p>C-Mail Intelligence v1.0.0</p>
        <p className="mt-1">Built with privacy in mind ❤️</p>
      </div>
    </div>
  );
}

