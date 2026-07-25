import { Stack, useRouter } from "expo-router";
import React from "react";

import { Button, EmptyState, Screen } from "@/components/ui";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <Screen scroll>
        <EmptyState
          icon="compass"
          title="This page does not exist"
          body="The link you followed points somewhere that is not part of the app."
          action={<Button label="Back to Identify" icon="home" onPress={() => router.replace("/(tabs)")} />}
        />
      </Screen>
    </>
  );
}
