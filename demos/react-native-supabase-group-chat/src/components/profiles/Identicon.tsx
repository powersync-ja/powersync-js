import { SvgXml } from 'react-native-svg';

import { minidenticon } from './minidenticon';

export function Identicon({ handle, width, color }: { handle: string; width: number; color?: string }) {
  const identicon = minidenticon(handle);

  return color ? (
    <SvgXml xml={identicon} width={width} height={width} fill={color} />
  ) : (
    <SvgXml xml={identicon} width={width} height={width} />
  );
}
