import React from 'react';

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // uint32
}

function hslFromHash(hash: number): { h: number; s: number; l: number } {
  const h = hash % 360;
  const s = 55 + (hash % 30); // 55–85
  const l = 50; // fixed lightness for contrast
  return { h, s, l };
}

export function Identicon({ seed, size = 32, className }: { seed: string; size?: number; className?: string }) {
  const hash = djb2Hash(seed);
  const { h, s, l } = hslFromHash(hash);
  const color = `hsl(${h}, ${s}%, ${l}%)`;
  const bg = '#f3f4f6'; // gray-100
  const cells = 5;
  const cell = Math.floor(size / cells);
  const padding = Math.max(0, Math.floor((size - cell * cells) / 2));

  // Build 5x5 symmetric pattern using left 3 cols mirrored
  const bits: boolean[] = [];
  let n = hash;
  for (let i = 0; i < 15; i++) {
    bits.push((n & 1) === 1);
    n = (n >>> 1) ^ ((n & 1) * 0x45d9f3b);
  }

  const rects: React.ReactNode[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const xl = x < 3 ? x : 4 - x; // mirror index
      const idx = y * 3 + xl; // 0..14
      const on = bits[idx];
      if (!on) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={padding + x * cell}
          y={padding + y * cell}
          width={cell}
          height={cell}
          fill={color}
          rx={Math.max(1, Math.floor(cell / 6))}
        />
      );
    }
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      <rect x={0} y={0} width={size} height={size} fill={bg} rx={Math.floor(size / 6)} />
      {rects}
    </svg>
  );
}

export default Identicon;
