/** Haptics + speech, both safe no-ops where the platform lacks support. */
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

const supported = Platform.OS === "ios" || Platform.OS === "android";

export const tap = () => {
  if (supported) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const success = () => {
  if (supported) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const warn = () => {
  if (supported) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

export const speak = (text: string) => {
  void Speech.stop();
  Speech.speak(text, { rate: 0.98, pitch: 1.0 });
};

/** Returns void, not a promise — safe to use directly as a useEffect cleanup. */
export const stopSpeaking = (): void => {
  void Speech.stop();
};
