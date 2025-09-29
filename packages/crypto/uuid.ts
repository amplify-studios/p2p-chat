export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateBase58Id(length: number = 16): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let id = '';
  for (let i = 0; i < length; i++) {
    id += alphabet[array[i] % alphabet.length];
  }
  return id;
}
