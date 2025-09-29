import LZString from 'lz-string';

// Compress your payload
export function encodePayload(payload: object): string {
  const json = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(json);
}

// Decompress your payload
export function decodePayload(encoded: string) {
  const json = LZString.decompressFromEncodedURIComponent(encoded);
  if (!json) throw new Error('Invalid compressed payload');
  return JSON.parse(json);
}
