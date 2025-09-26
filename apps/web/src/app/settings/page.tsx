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
import { useToast } from '@/components/local/ToastContext';
import { Archive, QrCode, Server, ShieldBan, Trash } from 'lucide-react';
import { useConfirm } from '@/components/local/ConfirmContext';

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [backupLoading, setBackupLoading] = useState(false);
  const [eraseLoading, setEraseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();

  if (!user) return <Loading />;

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await backupDB(`p2p-${user.username}-${user.userId}-backup.json`);
      showToast('Backup completed successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Backup failed', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleErase = async () => {
    const confirmed = await confirm({
      title: "Erase Local Data?",
      message: 'Are you sure you want to erase all data? This action cannot be undone.',
      confirmText: "Erase",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    setEraseLoading(true);
    try {
      await eraseDB();
      showToast('Erased all data successfully!', 'success');

      const client = await getSignalingClient();
      client.disconnect();
    } catch (err) {
      console.error(err);
      showToast('Erasing data failed', 'error');
    } finally {
      setEraseLoading(false);
      router.push('/login');
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
      sessionStorage.clear();
      showToast('Database restored successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Restoring database failed', 'error');
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <SettingsRow label="Theme">
        <ThemeSwitcher />
      </SettingsRow>

      <SettingsRow label="Backup Data">
        <Button
          size="sm"
          variant="outline"
          onClick={handleBackup}
          disabled={backupLoading}
        >
          <Archive className="mr-1 h-4 w-4" />
          {backupLoading ? 'Backing up...' : 'Backup'}
        </Button>
      </SettingsRow>

      <SettingsRow label="Restore Data">
        <Input
          type="file"
          accept="application/json"
          onChange={handleRestore}
          disabled={restoreLoading}
          className="cursor-pointer"
        />
      </SettingsRow>

      <SettingsRow label="Erase Data">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleErase}
          disabled={eraseLoading}
        >
          <Trash className="mr-1 h-4 w-4" />
          {eraseLoading ? 'Erasing...' : 'Erase'}
        </Button>
      </SettingsRow>

      <Button
        className="w-full"
        variant="outline"
        onClick={() => router.push('/blocked')}
      >
        <ShieldBan className="mr-1 h-4 w-4" /> Block List
      </Button>

      <Button
        className="w-full"
        variant="outline"
        onClick={() => router.push('/servers')}
      >
        <Server className="mr-1 h-4 w-4" /> Servers
      </Button>

      <div className="block md:hidden">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => router.push('/qr')}
        >
          <QrCode className="mr-1 h-4 w-4" /> QR Scanner
        </Button>
      </div>
    </div>
  );
}
