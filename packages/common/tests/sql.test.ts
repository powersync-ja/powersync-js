import { describe, expect, it } from 'vitest';
import { sanitizeSQL } from '../src/client/triggers/sanitizeSQL.js';
describe('SQL', () => {
  describe('sanitization', () => {
    it('should sanitize quoted strings', () => {
      expect(sanitizeSQL`New.id = ${"O'Reilly"}`).toBe("New.id = 'O''Reilly'");
    });

    it('should handle null and undefined', () => {
      expect(sanitizeSQL`val = ${null}`).toBe('val = NULL');
      expect(sanitizeSQL`val = ${undefined}`).toBe('val = NULL');
    });

    it('should handle numbers', () => {
      expect(sanitizeSQL`age = ${42}`).toBe('age = 42');
      expect(sanitizeSQL`price = ${3.14}`).toBe('price = 3.14');
    });

    it('should handle objects', () => {
      expect(sanitizeSQL`data = ${{ foo: 'bar' }}`).toBe(`data = '{"foo":"bar"}'`);
    });

    it('should escape single quotes in stringified objects', () => {
      const obj = { foo: "O'Reilly" };
      const clause = sanitizeSQL`data = ${obj}`;
      expect(clause).toBe(`data = '{"foo":"O''Reilly"}'`);
    });

    it('should interpolate multiple values', () => {
      const name = 'Alice';
      const age = 30;
      const clause = sanitizeSQL`name = ${name} AND age = ${age}`;
      expect(clause).toBe("name = 'Alice' AND age = 30");
    });

    it('should stringify arrays', () => {
      expect(sanitizeSQL`arr = ${[1, 2, 3]}`).toBe(`arr = '[1,2,3]'`);
      expect(sanitizeSQL`arr = ${['a', "O'Reilly", null]}`).toBe(`arr = '["a","O''Reilly",null]'`);
    });
  });
});
