import CryptoJS from "crypto-js";

export default function hmacSign(sharedKey: string, message: string):string {
    return CryptoJS.HmacSHA256(message, sharedKey).toString(CryptoJS.enc.Hex);
}

export function hmacVerify(sharedKey: string, message: string, hashToVerify:string):boolean {
    const expectedHash = hmacSign(sharedKey, message);

    let result = 0;
    for(let i=0; i < expectedHash.length; i++) {
        result = result | expectedHash.charCodeAt(i) ^ hashToVerify.charCodeAt(i);
    }

    return result === 0;
}