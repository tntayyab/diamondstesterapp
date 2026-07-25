import { useRouter } from "expo-router";
import React from "react";

import { Button, EmptyState, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/**
 * Wraps a screen that requires a signed-in account. A guest sees a friendly
 * lock screen with a sign-in button instead of the gated content; once they
 * sign in the real `children` render (the auth context updates in place).
 */
export function AuthGate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Avoid flashing the gate for a signed-in user while the session loads.
  if (loading) return <Screen />;

  if (!user) {
    return (
      <Screen scroll>
        <EmptyState
          icon="lock"
          title={title}
          body={body}
          action={
            <Button label="Sign in or create account" icon="log-in" onPress={() => router.push("/sign-in")} />
          }
        />
      </Screen>
    );
  }

  return <>{children}</>;
}
