import React from 'react';

import { PALETTE } from '@/library/palette';

export interface ColorPaletteProps {
  selected: number;
  onSelect: (index: number) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ selected, onSelect }) => {
  return (
    <div className="palette" role="radiogroup" aria-label="Colour palette">
      {PALETTE.map((hex, index) => (
        <button
          key={hex}
          type="button"
          role="radio"
          aria-checked={index === selected}
          aria-label={`Colour ${index + 1}`}
          className={`palette__swatch${index === selected ? ' palette__swatch--selected' : ''}`}
          style={{ backgroundColor: hex }}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
};

export default ColorPalette;
