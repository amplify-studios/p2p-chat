'use client';

import { useState } from 'react';
import Loading from '@/components/local/Loading';
import ThemeSwitcher from '@/components/local/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { backupDB, eraseDB, restoreDB } from '@/lib/storage';
import { useRouter } from 'next/navigation';
import { refreshRooms } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getSignalingClient } from '@/lib/signalingClient';
import QrScanner from "@/components/local/QrScanner";
import { useToast } from '@/components/local/ToastContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [backupLoading, setBackupLoading] = useState(false);
  const [eraseLoading, setEraseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const { showToast } = useToast();

  if (!user) return <Loading />;


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

      // Quit signaling server
      const client = await getSignalingClient();
      client.disconnect();
    } catch (err) {
      console.error(err);
      alert('Erasing data failed');
    } finally {
      setEraseLoading(false);
      router.push("/login");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    try {
      const text = await file.text();
      await restoreDB(text);
      refreshRooms();
      showToast('Database restored successfully!');
    } catch (err) {
      console.error(err);
      alert('Restoring database failed');
    } finally {
      setRestoreLoading(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleBlocklist = () => {
    router.push('/blocked');
  }

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
        <span className="font-medium">Restore Data</span>
        <Input
          type="file"
          accept="application/json"
          onChange={handleRestore}
          disabled={restoreLoading}
          className="cursor-pointer"
        />
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

      <div className="flex items-center justify-center">
        <Button
          className='w-[100%]'
          variant="outline"
          onClick={handleBlocklist}
        >
          Block list
        </Button>
      </div>

      { /*
      <div className="flex items-center justify-between">
        <QrScanner onScan={(data) => {
          console.log("Scanned QR payload:", data);
        }} />
      </div>
      */ }
    </div>
  );
}
