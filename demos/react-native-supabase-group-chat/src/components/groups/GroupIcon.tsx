import { Users } from '@tamagui/lucide-icons';
import { Avatar } from 'tamagui';

export function GroupIcon({ create }: { create?: boolean }) {
  return (
    <Avatar
      circular
      size="$3"
      backgroundColor={create ? 'transparent' : '$gray5'}
      borderColor={create ? '$gray9' : 'transparent'}
      borderWidth={create ? '$1' : 0}
      borderStyle={create ? 'dashed' : undefined}
    >
      <Users size="$1.5" color={create ? '$gray9' : '$color'} />
    </Avatar>
  );
}
