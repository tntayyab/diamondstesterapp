import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Avatar } from "@/components/Avatar";
import { Button, Screen, ThemedText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { success, tap, warn } from "@/lib/feedback";
import { updateProfile, uploadAvatar } from "@/lib/profile";
import { brand, fontSize, radius, spacing, useTheme } from "@/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(null); // newly picked, not yet uploaded
  const [saving, setSaving] = useState(false);

  const pickAvatar = useCallback(async () => {
    tap();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  }, []);

  const save = useCallback(async () => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) avatarUrl = (await uploadAvatar(user.id, avatarUri)) ?? undefined;

      await updateProfile(user.id, {
        full_name: name,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      await refreshProfile();
      success();
      router.back();
    } catch (error) {
      warn();
      showAlert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [user, name, avatarUri, refreshProfile, router]);

  return (
    <Screen scroll edges={["bottom"]}>
      {/* Avatar */}
      <View style={{ alignItems: "center", marginTop: spacing.xl }}>
        <Pressable onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Avatar name={profile?.full_name ?? user?.email ?? null} uri={profile?.avatar_url ?? null} size={110} />
          )}
          <View style={[styles.camBadge, { backgroundColor: brand.indigo, borderColor: colors.background }]}>
            <Feather name="camera" size={16} color="#fff" />
          </View>
        </Pressable>
        <Pressable onPress={pickAvatar} style={{ marginTop: spacing.md }}>
          <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
            Change photo
          </ThemedText>
        </Pressable>
      </View>

      {/* Name */}
      <ThemedText variant="label" muted style={{ marginTop: spacing.xxl, marginBottom: spacing.sm }}>
        Display name
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
      />

      <ThemedText variant="caption" muted style={{ marginTop: spacing.sm, fontSize: 12 }}>
        This is the name and photo shown on your community posts and comments.
      </ThemedText>

      <Button label="Save profile" icon="check" loading={saving} onPress={save} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 110, height: 110, borderRadius: 55 },
  camBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.base,
  },
});
