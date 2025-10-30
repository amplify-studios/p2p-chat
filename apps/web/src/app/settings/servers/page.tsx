'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useDB } from '@/contexts/DBContext';
import { CLIENT_CONFIG, ServerSettingsType } from '@chat/core';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/local/Loading';
import { getSignalingClient } from '@/lib/signalingClient';
import { generateBase58Id } from '@chat/crypto';

export default function Servers() {
  const { showToast } = useToast();
  const { putEncr, getAllDecr } = useDB();
  const { key } = useAuth();

  const [serverSettingsId, setServerSettingsId] = useState<string>('');
  const [useSelect, setUseSelect] = useState(false);
  const [autoSelectAll, setAutoSelectAll] = useState(false);
  const [useUser, setUseUser] = useState(false);
  const [shareFederation, setShareFederation] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [userServers, setUserServers] = useState<string[]>([]);
  const [newServer, setNewServer] = useState('');
  const [servers, setServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadedOnce = useRef(false);

  useEffect(() => {
    setServerSettingsId(generateBase58Id());
    setServers(CLIENT_CONFIG.signalingUrls);
    setSelectedServer(CLIENT_CONFIG.signalingUrls[0]);
  }, []);

  useEffect(() => {
    if (!key || loadedOnce.current) return;
    loadedOnce.current = true;

    (async () => {
      const settings = (await getAllDecr('serverSettings', key)) as ServerSettingsType[];
      const currentSettings = settings.at(0);
      if (!currentSettings) {
        setLoading(false);
        return;
      }

      setUseSelect(currentSettings.useSelect);
      setAutoSelectAll(currentSettings.autoSelectAll);
      setUseUser(currentSettings.useUser);
      setShareFederation(currentSettings.shareFederation);

      const merged = Array.from(
        new Set([...CLIENT_CONFIG.signalingUrls, ...(currentSettings.userServers || [])]),
      );
      setServers(merged);

      const saved = currentSettings.selectedServers?.[0];
      if (saved && merged.includes(saved)) {
        setSelectedServer(saved);
      } else {
        setSelectedServer(merged[0] || null);
      }

      setUserServers(currentSettings.userServers || []);
      setLoading(false);
    })();
  }, [key, getAllDecr]);

  const selectServer = (server: string) => {
    setSelectedServer(server);
  };

  const addUserServer = () => {
    const trimmed = newServer.trim();
    if (!trimmed) return;

    try {
      const url = new URL(trimmed);
      if (!['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)) {
        showToast('Invalid protocol: must be ws://, wss://, http://, or https://', 'error');
        return;
      }
    } catch {
      showToast('Invalid URL format', 'error');
      return;
    }

    if (userServers.includes(trimmed)) {
      showToast('Server already added', 'warning');
      return;
    }

    setUserServers((prev) => [...prev, trimmed]);
    setServers((prev) => Array.from(new Set([...prev, trimmed])));
    setNewServer('');
    showToast('Added server', 'success');
  };

  const removeUserServer = (server: string) => {
    setUserServers((prev) => prev.filter((s) => s !== server));
    setServers((prev) => {
      const updated = prev.filter((s) => s !== server);
      setSelectedServer((prevSel) => (prevSel === server ? updated[0] || null : prevSel));
      return updated;
    });
  };

  useEffect(() => {
    if (autoSelectAll && servers.length > 0) {
      setSelectedServer(servers[0]);
    }
  }, [autoSelectAll, servers]);

  if (loading) return <Loading />;

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6 overflow-x-hidden">
      <h1 className="text-xl font-bold">Server Settings</h1>

      {/* Selected servers */}
      <div className="flex flex-col gap-4 border rounded-lg p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {servers.map((server) => (
              <label
                key={server}
                className="flex items-start gap-2 cursor-pointer break-all"
              >
                <input
                  type="radio"
                  name="server"
                  checked={selectedServer === server}
                  onChange={() => selectServer(server)}
                  className="mt-[2px] shrink-0"
                />
                <div className="flex flex-wrap items-center gap-1 break-all">
                  <span className="break-all">{server}</span>
                  {server === CLIENT_CONFIG.signalingUrls[0] && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      (Recommended)
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* User-defined servers */}
      <div className="flex flex-col gap-4 border rounded-lg p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter server URL"
            value={newServer}
            onChange={(e) => setNewServer(e.target.value)}
          />
          <Button onClick={addUserServer}>Add</Button>
        </div>

        <ul className="flex flex-col gap-2">
          {userServers.map((server) => (
            <li
              key={server}
              className="flex items-center justify-between border rounded px-3 py-2 break-all"
            >
              <span className="break-all">{server}</span>
              <Button size="icon" variant="ghost" onClick={() => removeUserServer(server)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={async () => {
          if (!key) return;
          const settings: ServerSettingsType = {
            serverSettingsId,
            useSelect,
            autoSelectAll,
            selectedServers: selectedServer ? [selectedServer] : [],
            useUser,
            userServers,
            shareFederation,
          };
          await putEncr('serverSettings', settings, key, 0);
          showToast('Saved server settings', 'success');

          await getSignalingClient();
        }}
      >
        Save Settings
      </Button>
    </div>
  );
}
