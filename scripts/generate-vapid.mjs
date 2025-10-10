#!/usr/bin/env node

import fs from "fs";
import path from "path";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Generated VAPID keys:");
console.log("PUBLIC_KEY:", keys.publicKey);
console.log("PRIVATE_KEY:", keys.privateKey);

//Prepare .env.local content
const envContent = `VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
`;

//Write .env.local at project root
const envPath = path.resolve(process.cwd(), "./apps/web/.env.local");
fs.writeFileSync(envPath, envContent, { encoding: "utf8" });

console.log(`\n.env.local file created at ${envPath}`);
