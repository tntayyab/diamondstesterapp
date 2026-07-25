import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { showAlert } from "@/components/AppAlert";
import { Button, ThemedText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { success, tap } from "@/lib/feedback";
import { fontSize, radius, spacing, useTheme } from "@/theme";

/**
 * Shown when the user opens a password-reset link (`recovery` becomes true).
 * They set a new password, which completes the reset. Mounted once at the root.
 */
export function RecoveryGate() {
  const { colors } = useTheme();
  const { recovery, updatePassword, clearRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    if (password.length < 6) {
      showAlert("Password too short", "Use at least 6 characters.");
      return;
    }
    tap();
    setBusy(true);
    const error = await updatePassword(password);
    setBusy(false);
    if (error) {
      showAlert("Could not update password", error);
      return;
    }
    success();
    setPassword("");
    clearRecovery();
    showAlert("Password updated", "Your new password is set — you're all signed in.", [{ text: "OK" }], {
      mood: "happy",
    });
  }, [password, updatePassword, clearRecovery]);

  if (!recovery) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <ThemedText variant="heading" style={{ textAlign: "center" }}>
            Set a new password
          </ThemedText>
          <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: spacing.sm }}>
            Choose a new password for your account.
          </ThemedText>

          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!show}
              autoCapitalize="none"
              textContentType="newPassword"
              style={{ flex: 1, color: colors.text, fontSize: fontSize.base, paddingVertical: 12 }}
            />
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={12} style={{ paddingLeft: spacing.sm }}>
              <Feather name={show ? "eye-off" : "eye"} size={19} color={colors.textMuted} />
            </Pressable>
          </View>

          <Button label="Save new password" icon="check" onPress={save} loading={busy} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
});
