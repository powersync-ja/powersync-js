import { describe, it, expect } from 'vitest';
import { createPasswordCrypto } from '../src/index';

describe('password crypto roundtrip', () => {
  it('encrypts and decrypts', async () => {
    const crypto = createPasswordCrypto({ password: 'correct horse battery staple' });
    const msg = new TextEncoder().encode('hello secret world');
    const env = await crypto.encrypt(msg, 'todo-v1');
    const out = await crypto.decrypt(env);
    expect(new TextDecoder().decode(out)).toBe('hello secret world');
  });
});

