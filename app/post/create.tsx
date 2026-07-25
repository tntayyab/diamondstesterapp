import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { showAlert } from "@/components/AppAlert";

import { ImageStrip } from "@/components/ImageStrip";
import { Button, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { speciesLibrary } from "@/content/species";
import { speciesImage } from "@/content/speciesImages";
import { useAuth } from "@/lib/auth";
import { createPost, fetchPost, updatePost } from "@/lib/community";
import { success, tap, warn } from "@/lib/feedback";
import { captureFromCamera, mergeImagesCapped, pickFromGallery, MAX_IMAGES } from "@/lib/images";
import { resolveCurrentLocation } from "@/lib/location";
import { brand, fontSize, radius, spacing, useTheme } from "@/theme";

const PICKABLE = speciesLibrary.filter((s) => speciesImage(s.slug));

export default function CreatePostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);

  /** Staged photos for the new post (max `MAX_IMAGES`). Ignored entirely in edit mode. */
  const [images, setImages] = useState<string[]>([]);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [speciesSlug, setSpeciesSlug] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [locating, setLocating] = useState(false);

  // In edit mode, prefill from the existing post. The photo itself can't be
  // swapped on edit (keeps the upload path simple) — it shows read-only.
  useEffect(() => {
    if (!id) return;
    void fetchPost(id).then((post) => {
      if (!post) return;
      setExistingImage(post.image_url);
      setTitle(post.title ?? "");
      setDescription(post.description ?? "");
      setLocation(post.location ?? "");
      setSpeciesSlug(post.species_slug);
    });
  }, [id]);

  const pickImages = useCallback(async () => {
    tap();
    const uris = await pickFromGallery(MAX_IMAGES);
    if (uris.length) setImages((current) => mergeImagesCapped(current, uris));
  }, []);

  const takePhoto = useCallback(async () => {
    tap();
    const uri = await captureFromCamera();
    if (uri) setImages((current) => mergeImagesCapped(current, [uri]));
  }, []);

  /** Once at least one photo is staged, "+" re-opens this same chooser. */
  const addMore = useCallback(() => {
    showAlert("Add a photo", "Take a new photo or choose from your gallery.", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: () => void takePhoto() },
      { text: "Gallery", onPress: () => void pickImages() },
    ]);
  }, [takePhoto, pickImages]);

  const removeImage = useCallback((index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  }, []);

  const useMyLocation = useCallback(async () => {
    if (locating) return;
    tap();
    setLocating(true);
    try {
      const resolved = await resolveCurrentLocation();
      if (resolved) {
        setLocation(resolved.label);
        setCoords({ latitude: resolved.latitude, longitude: resolved.longitude });
      }
    } finally {
      setLocating(false);
    }
  }, [locating]);

  const submit = useCallback(async () => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    if (!editing && images.length === 0 && !title.trim() && !description.trim()) {
      showAlert("Add something first", "A post needs at least a photo or some text.");
      return;
    }

    setPosting(true);
    try {
      if (editing && id) {
        await updatePost(id, { title, description, speciesSlug, location });
      } else {
        await createPost(user.id, {
          imageUris: images,
          title,
          description,
          speciesSlug,
          location,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        });
      }
      success();
      router.back();
    } catch (error) {
      warn();
      showAlert(editing ? "Could not save" : "Could not post", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPosting(false);
    }
  }, [user, editing, id, images, title, description, speciesSlug, location, coords, router]);

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? "Edit post" : "Create post" }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image(s) — editable when creating (up to 6), read-only when editing */}
        {editing ? (
          existingImage ? (
            <Image source={{ uri: existingImage }} style={styles.preview} contentFit="cover" />
          ) : null
        ) : images.length > 0 ? (
          <View>
            <ImageStrip images={images} onRemove={removeImage} onAdd={addMore} max={MAX_IMAGES} />
            <ThemedText variant="caption" muted style={{ marginTop: spacing.sm }}>
              {images.length} of {MAX_IMAGES} photos
            </ThemedText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <PickTile icon="image" label="Add photo" onPress={pickImages} />
            <PickTile icon="camera" label="Take photo" onPress={takePhoto} />
          </View>
        )}

        {/* Text */}
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Found this in my garden)"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Say something about it…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text },
            ]}
          />
        </View>

        {/* Location */}
        <SectionHeader title="Location" />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TextInput
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setCoords(null); // hand-edited — stop trusting the GPS coords that filled it in
            }}
            placeholder="Enter location"
            placeholderTextColor={colors.textFaint}
            style={[
              styles.input,
              { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text },
            ]}
          />
          <Pressable
            onPress={useMyLocation}
            disabled={locating}
            accessibilityLabel="Use my current location"
            style={[
              styles.locateBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: locating ? 0.6 : 1 },
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Feather name="map-pin" size={19} color={colors.tint} />
            )}
          </Pressable>
        </View>

        {/* Species picker */}
        <SectionHeader title="Which gemstone? (optional)" />
        <ThemedText variant="caption" muted style={{ marginBottom: spacing.md }}>
          Tag a gemstone so your post shows up in that category.
        </ThemedText>
        <View style={styles.speciesGrid}>
          {PICKABLE.map((s) => {
            const active = s.slug === speciesSlug;
            return (
              <Pressable
                key={s.slug}
                onPress={() => {
                  tap();
                  setSpeciesSlug(active ? null : s.slug);
                }}
                style={styles.speciesItem}
              >
                <View style={[styles.speciesRing, { borderColor: active ? brand.indigo : colors.cardBorder }]}>
                  <Image source={speciesImage(s.slug)!} style={styles.speciesImg} contentFit="cover" />
                  {active ? (
                    <View style={styles.check}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  ) : null}
                </View>
                <ThemedText variant="caption" numberOfLines={1} style={{ fontSize: 10, maxWidth: 68, textAlign: "center" }}>
                  {s.commonName}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Button
          label={editing ? "Save changes" : "Post to community"}
          icon={editing ? "check" : "send"}
          loading={posting}
          onPress={submit}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}

function PickTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickTile,
        { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Feather name={icon} size={24} color={colors.tint} />
      <ThemedText variant="caption" style={{ fontWeight: "600" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 260, borderRadius: radius.lg },
  removeImg: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  pickTile: {
    flex: 1,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: fontSize.base,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  locateBtn: {
    width: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  speciesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  speciesItem: { alignItems: "center", gap: 4, width: 72 },
  speciesRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2 },
  speciesImg: { width: "100%", height: "100%", borderRadius: 28 },
  check: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
});
