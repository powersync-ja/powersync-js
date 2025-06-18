// For cli usage: node --import ./register.mjs src/main.ts
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import 'dotenv/config';

register('ts-node/esm', pathToFileURL('./'));
