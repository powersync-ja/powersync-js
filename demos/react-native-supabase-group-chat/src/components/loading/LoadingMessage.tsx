import { Spinner, Text, YStack } from "tamagui";

export function LoadingMessage({
  message,
  showSpinner = true,
}: {
  message?: string;
  showSpinner?: boolean;
}) {
  message ??= "Loading";

  return (
    <YStack fullscreen={true} justifyContent="center">
      {showSpinner && <Spinner size="large" />}
      <Text textAlign="center" marginTop="$6">
        {message} …
      </Text>
    </YStack>
  );
}
