import crypto from "crypto";

export function hmacSign(sharedKey: Uint8Array, message: string):string {
    return crypto
        .createHmac('sha256', sharedKey)
        .update(message)
        .digest('hex');
}

export function hmacVerify(sharedKey: Uint8Array, message: string, hashToVerify:string):boolean {
    const expectedHash = hmacSign(sharedKey, message);

    let result = 0;
    for(let i=0; i < expectedHash.length; i++) {
        result = result | expectedHash.charCodeAt(i) ^ hashToVerify.charCodeAt(i);
    }

    return result === 0;
}

export function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
