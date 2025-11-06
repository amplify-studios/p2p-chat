import { RoomType } from '@chat/core';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}

export function refreshRooms() {
  localStorage.setItem('rooms_updated', Date.now().toString());
  window.dispatchEvent(new StorageEvent('storage', { key: 'rooms_updated' }));
}

/**
 * Converts a string of bytes into a Uint8Array.
 * Supports:
 *  - Space-separated bytes: "12 34 255"
 *  - Comma-separated bytes: "12,34,255"
 *  - Hex bytes: "0x0C 0x22 0xFF"
 */
export function parseBytes(str: string): Uint8Array {
  if (!str) return new Uint8Array();

  // Split by spaces or commas
  const parts = str.split(/[\s,]+/);

  const bytes = parts.map((part) => {
    part = part.trim();
    if (!part) return 0;

    // Detect hex format
    if (part.startsWith('0x') || part.startsWith('0X')) {
      return parseInt(part, 16);
    }

    // Default decimal
    return parseInt(part, 10);
  });

  return new Uint8Array(bytes);
}

export function findRoomIdByPeer(rooms: RoomType[], peerId: string): string | undefined {
  for (const room of rooms) {
    if (room.keys.some((k) => k.userId === peerId)) {
      return room.roomId;
    }
  }
  return undefined;
}

/**
 * Encodes a File or Blob into a Base64 string.
 * @param file The File or Blob to encode.
 * @returns A Promise resolving to the Base64 string (without the data: prefix).
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // remove the "data:*/*;base64," prefix
      resolve(base64);
    };

    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
}
