/**
 * Expo config plugin: wire the Play Store upload keystore into the release
 * build. Runs on every `expo prebuild`, so the signing config survives even
 * when android/ is regenerated.
 *
 * Reads credentials from `credentials/signing.json` (kept out of the app bundle
 * and off any git remote). If that file is missing, the release build silently
 * falls back to the debug keystore, so debug/dev builds still work anywhere.
 */
const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function readSigning(projectRoot) {
  const p = path.join(projectRoot, "credentials", "signing.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const withUploadSigning = (config) => {
  // 1. Push the credentials into android/gradle.properties.
  config = withGradleProperties(config, (cfg) => {
    const signing = readSigning(cfg.modRequest.projectRoot);
    if (!signing) return cfg;
    const set = (key, value) => {
      const idx = cfg.modResults.findIndex((it) => it.type === "property" && it.key === key);
      const entry = { type: "property", key, value: String(value) };
      if (idx >= 0) cfg.modResults[idx] = entry;
      else cfg.modResults.push(entry);
    };
    set("DIAMONDS_UPLOAD_STORE_FILE", signing.storeFile);
    set("DIAMONDS_UPLOAD_STORE_PASSWORD", signing.storePassword);
    set("DIAMONDS_UPLOAD_KEY_ALIAS", signing.keyAlias);
    set("DIAMONDS_UPLOAD_KEY_PASSWORD", signing.keyPassword);
    return cfg;
  });

  // 2. Add a `release` signingConfig and point the release buildType at it.
  config = withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (!gradle.includes("DIAMONDS_UPLOAD_STORE_FILE")) {
      gradle = gradle.replace(
        /signingConfigs \{/,
        `signingConfigs {
        release {
            if (project.hasProperty('DIAMONDS_UPLOAD_STORE_FILE')) {
                storeFile file(project.property('DIAMONDS_UPLOAD_STORE_FILE'))
                storePassword project.property('DIAMONDS_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('DIAMONDS_UPLOAD_KEY_ALIAS')
                keyPassword project.property('DIAMONDS_UPLOAD_KEY_PASSWORD')
            }
        }`,
      );
      gradle = gradle.replace(
        /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig project.hasProperty('DIAMONDS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      );
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });

  return config;
};

module.exports = withUploadSigning;
