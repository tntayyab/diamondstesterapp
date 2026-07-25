import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { Button, Card, EmptyState, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { exportJournalCsv } from "@/lib/export";
import { success } from "@/lib/feedback";
import { addSighting, deleteSighting, getSightings, type Sighting } from "@/lib/storage";
import { fontSize, radius, spacing, useTheme } from "@/theme";

export default function JournalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    void getSightings().then(setSightings);
  }, []);

  const reset = () => {
    setComposing(false);
    setTitle("");
    setNotes("");
    setImageUri(null);
  };

  const attachPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }, []);

  const save = useCallback(async () => {
    if (!title.trim()) {
      showAlert("Add a title", "Give this sighting a short name so you can find it later.");
      return;
    }

    const sighting: Sighting = {
      id: Crypto.randomUUID(),
      title: title.trim(),
      speciesSlug: null,
      notes: notes.trim(),
      imageUri,
      latitude: null,
      longitude: null,
      placeLabel: null,
      observedAt: new Date().toISOString(),
    };

    // Streak only advances for a completed scan (see the Scan screen) — logging a
    // free-text field journal entry on its own should not bump it.
    setSightings(await addSighting(sighting));
    success();
    reset();
  }, [title, notes, imageUri]);

  const remove = useCallback((id: string) => {
    showAlert("Delete sighting?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => setSightings(await deleteSighting(id)),
      },
    ]);
  }, []);

  return (
    <Screen scroll edges={[]}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title">Field journal</ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
            {sightings.length} {sightings.length === 1 ? "sighting" : "sightings"} · stored on this device
          </ThemedText>
        </View>
        {sightings.length > 0 ? (
          <Pressable onPress={() => void exportJournalCsv(sightings)} hitSlop={10}>
            <Feather name="download" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {composing ? (
        <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="heading">New sighting</ThemedText>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What did you see?"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.text }]}
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes — behaviour, web type, weather…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.text },
            ]}
          />

          {imageUri ? <Image source={{ uri: imageUri }} style={styles.formImage} contentFit="cover" /> : null}

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button label="Photo" icon="image" variant="secondary" onPress={attachPhoto} style={{ flex: 1 }} />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button label="Cancel" variant="ghost" onPress={reset} style={{ flex: 1 }} />
            <Button label="Save" icon="check" onPress={save} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button
          label="Log a sighting"
          icon="plus"
          // A field journal is a per-account record — sending it to the sign-in
          // screen is the whole point, not a dead end.
          onPress={() => (user ? setComposing(true) : router.push("/sign-in"))}
          style={{ marginTop: spacing.lg }}
        />
      )}

      <SectionHeader title="Logged sightings" />

      {sightings.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title="Your journal is empty"
          body="Log what you find — with a photo and notes. Export the whole lot to CSV whenever you like."
        />
      ) : (
        sightings.map((sighting) => (
          <Card key={sighting.id} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              {sighting.imageUri ? (
                <Image source={{ uri: sighting.imageUri }} style={styles.thumb} contentFit="cover" />
              ) : null}

              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText variant="heading" style={{ fontSize: 16 }} numberOfLines={1}>
                  {sighting.title}
                </ThemedText>
                <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
                  {new Date(sighting.observedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {sighting.placeLabel ? ` · ${sighting.placeLabel}` : ""}
                </ThemedText>
                {sighting.notes ? (
                  <ThemedText variant="caption" muted numberOfLines={2}>
                    {sighting.notes}
                  </ThemedText>
                ) : null}
              </View>

              <Pressable onPress={() => remove(sighting.id)} hitSlop={8}>
                <Feather name="trash-2" size={17} color={colors.textFaint} />
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: fontSize.base,
  },
  textarea: { minHeight: 88, textAlignVertical: "top" },
  formImage: { width: "100%", height: 160, borderRadius: radius.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
});
