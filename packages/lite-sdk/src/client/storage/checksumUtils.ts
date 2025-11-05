/**
 * Checksum utility functions
 *
 * SQLite stores checksums as 64-bit INTEGERs, so we preserve full precision in memory (bigint).
 * However, the checksum algorithm uses 32-bit unsigned wrapping, so we mask during arithmetic
 * to match the Rust implementation's behavior.
 */

/**
 * Normalize checksum to bigint (handles conversion from string, number, or bigint)
 * SQLite INTEGER columns are 64-bit, so we use bigint to preserve precision
 */
export function normalizeChecksum(checksum: string | number | bigint): bigint {
  if (typeof checksum === 'bigint') {
    return checksum;
  }
  if (typeof checksum === 'string') {
    return BigInt(checksum);
  }
  return BigInt(checksum);
}

/**
 * Add two checksums with 32-bit unsigned wrapping behavior
 *
 * SQLite stores checksums as 64-bit INTEGERs, so we preserve full precision in memory (bigint).
 * However, the checksum algorithm uses 32-bit unsigned wrapping, so we mask during arithmetic
 * to match the Rust implementation's behavior. The result is stored as full 64-bit value.
 *
 * We mask during arithmetic to ensure correct wrapping behavior, but don't mask stored values
 * to preserve full 64-bit precision from SQLite.
 */
export function addChecksums(a: bigint, b: bigint): bigint {
  // Mask inputs to 32-bit unsigned, add, then mask result to ensure 32-bit wrapping behavior
  // This matches Rust: (a + b) & 0xffffffff
  const a32 = a & 0xffffffffn;
  const b32 = b & 0xffffffffn;
  return (a32 + b32) & 0xffffffffn;
}

/**
 * Subtract two checksums with 32-bit unsigned wrapping behavior
 *
 * SQLite stores checksums as 64-bit INTEGERs, so we preserve full precision in memory (bigint).
 * However, the checksum algorithm uses 32-bit unsigned wrapping, so we mask during arithmetic
 * to match the Rust implementation's behavior.
 */
export function subtractChecksums(a: bigint, b: bigint): bigint {
  // For subtraction, we need to handle underflow properly
  // Convert to 32-bit unsigned, subtract, then mask
  const a32 = a & 0xffffffffn;
  const b32 = b & 0xffffffffn;
  // Handle underflow by adding 2^32 before masking
  const result = (a32 - b32 + 0x100000000n) & 0xffffffffn;
  return result;
}

