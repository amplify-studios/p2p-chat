import crypto from "crypto";

export default function getAESKeyThroughSharedSecret(sharedKey: Uint8Array, saltUint8?: Uint8Array) {
    const salt = saltUint8 && saltUint8.length ? Buffer.from(saltUint8) : crypto.randomBytes(16);
    const info = Buffer.from('aes-256-gcm-session', 'utf8');
    const key = crypto.hkdfSync('sha256', sharedKey, salt, info,32);

    return {key, salt}
}

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
