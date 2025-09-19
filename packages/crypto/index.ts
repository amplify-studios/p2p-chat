"use client";

import hmacSign from "./HASH";

export * from './uuid';

export { createECDHkey } from "./ECDH";

export function HmacUsage() {
    const sharedKey = "secret-key";
    const message = "Hello World!";
    const hex = hmacSign(sharedKey, message);

    console.log("Message: " + message);
    console.log("HMAC: " + hex);
}

HmacUsage();

