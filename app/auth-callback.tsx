import { Redirect } from "expo-router";
import React from "react";

/**
 * OAuth deep-link landing. After Google redirects to
 * `diamondstester://auth-callback`, `openAuthSessionAsync` has already
 * captured the code and set the session — this route just bounces the user
 * into the app instead of showing a "not found" page for the raw deep link.
 */
export default function AuthCallback() {
  return <Redirect href="/(tabs)" />;
}
