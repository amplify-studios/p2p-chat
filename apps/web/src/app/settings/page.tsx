'use client';

import { useState } from 'react';
import Loading from '@/components/local/Loading';
import ThemeSwitcher from '@/components/local/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { backupDB, eraseDB } from '@/lib/storage';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const user = useAuth(true);
  const router = useRouter();
  const [backupLoading, setBackupLoading] = useState(false);
  const [eraseLoading, setEraseLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!user) return <Loading />;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await backupDB();
      showToast('Backup completed successfully!');
    } catch (err) {
      console.error(err);
      alert('Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleErase = async () => {
    const confirmed = confirm('Are you sure you want to erase all data? This action cannot be undone.');
    if (!confirmed) return;

    setEraseLoading(true);
    try {
      await eraseDB();
      showToast('Erased all data successfully!');
    } catch (err) {
      console.error(err);
      alert('Erasing data failed');
    } finally {
      setEraseLoading(false);
      router.push("/login");
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
        <span className="font-medium">Backup Data</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBackup}
          disabled={backupLoading}
        >
          {backupLoading ? 'Backing up...' : 'Backup'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-medium">Erase Data</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleErase}
          disabled={eraseLoading}
        >
          {eraseLoading ? 'Erasing...' : 'Erase'}
        </Button>
      </div>

      {toast && (
        <div className="p-2 bg-green-100 text-green-800 rounded text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
