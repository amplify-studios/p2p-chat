import CryptoJS from "crypto-js";

export default function hmacSign(sharedKey: string, message: string) {
    const mac = CryptoJS.HmacSHA256(message, sharedKey);
    return mac.toString(CryptoJS.enc.Hex);
}