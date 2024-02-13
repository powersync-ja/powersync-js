// Adapted from: https://github.com/laurentpayot/minidenticons

const COLORS_NB = 9;
const DEFAULT_SATURATION = 95;
const DEFAULT_LIGHTNESS = 45;

const MAGIC_NUMBER = 5;

function simpleHash(str: string) {
  return (
    str
      .split("")
      .reduce(
        (hash, char) => (hash ^ char.charCodeAt(0)) * -MAGIC_NUMBER,
        MAGIC_NUMBER,
      ) >>> 2
  ); // 32 bit unsigned integer conversion disregarding last 2 bits for better randomness
}

export function minidenticon(
  seed = "",
  saturation = DEFAULT_SATURATION,
  lightness = DEFAULT_LIGHTNESS,
  hashFn = simpleHash,
) {
  const hash = hashFn(seed);
  const hue = (hash % COLORS_NB) * (360 / COLORS_NB);
  return (
    [...Array(seed ? 25 : 0)].reduce(
      (acc, e, i) =>
        // testing the 15 lowest weight bits of the hash
        hash & (1 << i % 15)
          ? acc +
            `<rect x="${i > 14 ? 7 - ~~(i / 5) : ~~(i / 5)}" y="${
              i % 5
            }" width="1" height="1"/>`
          : acc,

      `<svg viewBox="-1.5 -1.5 8 8"  fill="hsl(${hue} ${saturation}% ${lightness}%)">`,
    ) + "</svg>"
  );
}
