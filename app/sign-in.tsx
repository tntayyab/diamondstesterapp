import { useRouter } from "expo-router";
import React from "react";

import { AuthForm } from "@/components/AuthForm";

export default function SignInScreen() {
  const router = useRouter();
  // Reachable when already inside the app (e.g. from a gated action). On success
  // just pop back to wherever the user was.
  return <AuthForm onSuccess={() => router.back()} />;
}
