#!/usr/bin/env node

import fs from 'fs';
import yaml from 'js-yaml';

const file = fs.readFileSync('./config.yml', 'utf8');
const config = yaml.load(file);

const clientConfig = {
  appName: config.appName,
  stunServers: config.stunServers,
  turnServers: config.turnServers,
  signalingUrls: config.signaling.urls,
};

fs.writeFileSync('./packages/core/config.ts', `export const CLIENT_CONFIG = ${JSON.stringify(clientConfig, null, 2)};`);
console.log('Frontend config generated.');
