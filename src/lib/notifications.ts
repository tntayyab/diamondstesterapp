/**
 * Optional "go spotting" reminder. Notifications need a dev build on Android 13+
 * and are unavailable on web, so every call is defensive.
 *
 * Everything below is LOCAL scheduling only (permission request + on-device
 * alarms) — none of it touches the remote-push path, so it all works fine in
 * Expo Go. `expo-notifications` removed remote push support from Expo Go in
 * SDK 53: calling `getExpoPushTokenAsync()` / `getDevicePushTokenAsync()` /
 * `addPushTokenListener()` there logs the noisy "removed from Expo Go" warning
 * (see node_modules/expo-notifications/src/warnOfExpoGoPushUsage.ts) and can't
 * actually return a token. `isExpoGo` below is exported so any future
 * remote-push code (a real `getExpoPushTokenAsync()` call for server-sent
 * push) can skip straight to a no-op instead of hitting that path — mirroring
 * the `nativeReady`-style guard in `src/lib/purchases.ts`.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_ID = "daily-spotting-reminder";

/**
 * True when running inside Expo Go (as opposed to a dev client or a standalone
 * build). Expo Go has the JS half of every Expo module but not the native
 * remote-push registration path, so this is the trustworthy signal to gate on
 * — matching the `nativeReady` precedent in `src/lib/purchases.ts`.
 */
export const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Would-be wrapper for a real push token fetch. Not called anywhere today (the
 * app has no remote-push backend yet) — provided so any future caller cannot
 * accidentally trigger the Expo Go warning/crash path.
 */
export async function getExpoPushTokenSafe(projectId?: string): Promise<string | null> {
  if (Platform.OS === "web" || isExpoGo) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Schedules a daily reminder at `hour`:00 local time. Returns false if denied. */
export async function scheduleDailyReminder(hour: number): Promise<boolean> {
  if (!(await requestPermission())) return false;

  try {
    await cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Test a stone today",
        body: "Keep your streak alive — scan a diamond or gemstone and log it in your field journal.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    /* nothing scheduled */
  }
}

export async function reminderScheduled(): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((item) => item.identifier === REMINDER_ID);
  } catch {
    return false;
  }
}
