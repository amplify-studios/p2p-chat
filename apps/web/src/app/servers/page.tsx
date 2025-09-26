'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export default function Servers() {
  const [useSelect, setUseSelect] = useState(false);
  const [autoSelectAll, setAutoSelectAll] = useState(false);
  const [useUser, setUseUser] = useState(false);

  const [shareFederation, setShareFederation] = useState(false);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [userServers, setUserServers] = useState<string[]>([]);
  const [newServer, setNewServer] = useState('');

  const availableServers = ['Server A', 'Server B', 'Server C'];

  const toggleSelectedServer = (server: string) => {
    setSelectedServers(prev =>
      prev.includes(server)
        ? prev.filter(s => s !== server)
        : [...prev, server]
    );
  };

  const addUserServer = () => {
    if (newServer.trim() && !userServers.includes(newServer.trim())) {
      setUserServers(prev => [...prev, newServer.trim()]);
      setNewServer('');
    }
  };

  const removeUserServer = (server: string) => {
    setUserServers(prev => prev.filter(s => s !== server));
  };

  // Handle auto-select behavior
  useEffect(() => {
    if (autoSelectAll) {
      setSelectedServers([...availableServers]);
    }
  }, [autoSelectAll]);

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-bold">Server Settings</h1>

      {/* Selected servers */}
      <div className="flex flex-col gap-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <Label>Use selected servers</Label>
          <Switch checked={useSelect} onCheckedChange={setUseSelect} />
        </div>

        {useSelect && (
          <div className="flex flex-col gap-4">
            {/* Auto-select toggle */}
            <div className="flex items-center justify-between">
              <Label>Automatically select all servers</Label>
              <Switch
                checked={autoSelectAll}
                onCheckedChange={setAutoSelectAll}
              />
            </div>

            {/* Manual selection if autoSelectAll is off */}
            {!autoSelectAll && (
              <div className="flex flex-col gap-2">
                {availableServers.map(server => (
                  <label
                    key={server}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServers.includes(server)}
                      onChange={() => toggleSelectedServer(server)}
                    />
                    {server}
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="font-medium">Share information with federation</span>
              <Switch
                checked={shareFederation}
                onCheckedChange={setShareFederation}
              />
            </div>
          </div>
        )}
      </div>

      {/* User-defined servers */}
      <div className="flex flex-col gap-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <Label>Use user-defined servers</Label>
          <Switch checked={useUser} onCheckedChange={setUseUser} />
        </div>

        {useUser && (
          <>
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
              {userServers.map(server => (
                <li
                  key={server}
                  className="flex items-center justify-between border rounded px-3 py-2"
                >
                  <span>{server}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeUserServer(server)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Button
        onClick={() =>
          console.log({
            useSelect,
            autoSelectAll,
            selectedServers,
            useUser,
            userServers,
            shareFederation,
          })
        }
      >
        Save Settings
      </Button>
    </div>
  );
}
