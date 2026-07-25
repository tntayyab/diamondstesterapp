import React from "react";
import { Linking, StyleSheet } from "react-native";

import { Card, Row, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { env } from "@/config/env";
import { spacing } from "@/theme";

const open = (path: string) => void Linking.openURL(`${env.app.siteUrl}${path}`);

export default function AboutScreen() {
  return (
    <Screen scroll>
      <ThemedText variant="title">Diamonds Tester</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        An honest, educational diamond & gemstone testing companion — the native app for{" "}
        {env.app.siteUrl.replace("https://", "")}.
      </ThemedText>

      <Card style={{ marginTop: spacing.xl }}>
        <ThemedText variant="body">
          Photograph a diamond or gemstone and get a visual estimate — stone type, an authenticity read,
          confidence, and honest next steps. The gemstone library, manual test guides, the UV fluorescence
          simulator, the 4Cs quiz and the value estimator all work with no signal at all.
        </ThemedText>
      </Card>

      <SectionHeader title="What this app is — and isn't" />
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="body">
          This is an educational and novelty tool, not a certified gemological service. No photo, phone
          sensor, or app — including this one — can certify a diamond the way a trained gemologist with lab
          equipment can.
        </ThemedText>
        <ThemedText variant="caption" muted>
          • The camera is always your live device camera. We never substitute stock footage or a pre-recorded
          clip for a real scan — if a result shown is a bundled demo (only used when no AI backend is
          configured), it's clearly labelled "Demo result".{"\n\n"}
          • The UV test screen is honest that a phone screen cannot emit real UV light — it's a guided
          companion to a real UV flashlight, not a fake "UV camera".{"\n\n"}
          • We teach the real manual tests (fog, water, loupe, setting inspection) alongside the AI scan, so
          you're never dependent on the scan alone.{"\n\n"}
          • We don't sell your data. Scan history and saved items live on your device; an account only syncs
          what you choose to share (community posts, profile).
        </ThemedText>
      </Card>

      <SectionHeader title="Important" />
      <Card>
        <ThemedText variant="caption">
          Scan results are AI-assisted visual estimates and can be wrong. Nothing in this app is a substitute
          for a certified appraisal — for anything valuable, confirm with an independent professional
          gemologist before you buy, sell, or insure a stone.
        </ThemedText>
      </Card>

      <SectionHeader title="Legal" />
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="file-text" label="Terms of service" onPress={() => open("/terms")} />
        <Row icon="lock" label="Privacy policy" onPress={() => open("/privacy")} />
        <Row icon="alert-circle" label="Disclaimer" onPress={() => open("/disclaimer")} />
        <Row icon="rotate-ccw" label="Refund policy" onPress={() => open("/refund")} />
      </Card>

      <SectionHeader title="Contact" />
      <Card style={{ paddingVertical: 0 }}>
        <Row
          icon="mail"
          label="Email support"
          value={env.app.supportEmail}
          onPress={() => void Linking.openURL(`mailto:${env.app.supportEmail}`)}
        />
        <Row icon="globe" label="Visit the website" onPress={() => open("")} />
      </Card>

      <ThemedText variant="caption" muted style={styles.footer}>
        Version 1.0.0 · Built with Expo · © {new Date().getFullYear()} Diamonds Tester
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", marginTop: spacing.xxl, fontSize: 11 },
});
