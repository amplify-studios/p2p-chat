'use client';

import { useState } from 'react';
import Loading from '@/components/local/Loading';
import ThemeSwitcher from '@/components/local/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { backupDB } from '@/lib/storage';

export default function SettingsPage() {
  const user = useAuth(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return <Loading />;

  const handleBackup = async () => {
    setLoading(true);
    try {
      await backupDB();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Backup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex items-center justify-between">
        <span className="font-medium">Theme</span>
        <ThemeSwitcher />
      </div>

      <div className="flex items-center justify-between">
        <span className="font-medium">Backup Database</span>
        <Button size="sm" variant={"outline"} onClick={handleBackup} disabled={loading}>
          {loading ? 'Backing up...' : 'Backup'}
        </Button>
      </div>

      {success && (
        <div className="p-2 bg-green-100 text-green-800 rounded text-sm">
          Backup completed successfully!
        </div>
      )}
    </div>
  );
}
