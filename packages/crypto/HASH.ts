import crypto from "crypto";
import hkdf from "futoin-hkdf"

export function getAESKeyThroughSharedSecret(sharedKey: Uint8Array, saltUint8?: Uint8Array): {key: Uint8Array, salt: Uint8Array} {
    const sharedKeyBuf = Buffer.from(sharedKey);
    const salt = saltUint8 && saltUint8.length ? Buffer.from(saltUint8) : crypto.randomBytes(16);
    const info = Buffer.from('aes-256-gcm-session', 'utf8');
    const key = hkdf(sharedKeyBuf, 32, { salt, info, hash: "SHA-256" });
    

    //const temp = crypto.hkdfSync('sha256', sharedKey, salt, info, 32);
    //const key = Uint8Array.from(Buffer.from(temp));

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

export function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
