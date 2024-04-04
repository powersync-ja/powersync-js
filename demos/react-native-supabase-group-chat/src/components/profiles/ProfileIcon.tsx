import { Avatar, getTokenValue } from 'tamagui';

import { Identicon } from './Identicon';

export function ProfileIcon({ handle, create }: { handle: string; create?: boolean }) {
  const gray = getTokenValue('$color.gray9Light');

  return (
    <Avatar
      circular
      size="$3"
      backgroundColor={create ? 'transparent' : '$gray5'}
      borderColor={create ? '$gray9' : 'transparent'}
      borderWidth={create ? '$1' : 0}
      borderStyle={create ? 'dashed' : undefined}
    >
      <Identicon handle={handle} width={30} color={create ? gray : undefined} />
    </Avatar>
  );
}
