/**
 * Local-first persistence. Everything the app shows works offline; Supabase
 * sync (when signed in) is an enhancement layered on top, never a prerequisite.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ChatMessage } from "@/lib/chat";
import type { IdentifyResult } from "@/lib/identify";

export const KEYS = {
  history: "scan:history",
  savedSpecies: "saved:species",
  savedGuides: "saved:guides",
  journal: "journal:sightings",
  streak: "profile:streak",
  quiz: "quiz:stats",
  onboarded: "profile:onboarded",
  guestScans: "guest:scans",
  chat: "chat:messages",
  returning: "auth:returning",
  quizAttempts: "quiz:attempts",
} as const;

// ---------------------------------------------------------------------------
// First-launch onboarding
// ---------------------------------------------------------------------------

export async function hasOnboarded(): Promise<boolean> {
  return (await getItem<boolean>(KEYS.onboarded)) === true;
}

export async function setOnboarded(): Promise<void> {
  await setItem(KEYS.onboarded, true);
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is best-effort; a full disk must not crash the app.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Scan history
// ---------------------------------------------------------------------------

/** What the user observed during the UV fluorescence simulator (see app/uv-test.tsx). */
export interface UvObservation {
  fluorescence: "none" | "blue" | "yellow" | "other";
  note?: string;
  observedAt: string;
}

export interface ScanRecord {
  id: string;
  /** The primary (first) photo — kept for back-compat with records saved before multi-photo support. */
  imageUri: string | null;
  /** All photos attached to this scan (max 6), in the order the user added them. `imageUris[0] === imageUri`. */
  imageUris?: string[];
  result: IdentifyResult;
  createdAt: string;
  /** How the result was produced — surfaced as a badge on the result screen. */
  source: "edge" | "direct" | "demo";
  notes?: string;
  /** Logged separately via the UV test screen, attached here when the user comes from a scan. */
  uvObservation?: UvObservation;
}

export async function getHistory(): Promise<ScanRecord[]> {
  return (await getItem<ScanRecord[]>(KEYS.history)) ?? [];
}

export async function addScan(record: ScanRecord): Promise<ScanRecord[]> {
  const history = await getHistory();
  const next = [record, ...history].slice(0, 200);
  await setItem(KEYS.history, next);
  return next;
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const history = await getHistory();
  return history.find((entry) => entry.id === id) ?? null;
}

export async function deleteScan(id: string): Promise<ScanRecord[]> {
  const next = (await getHistory()).filter((entry) => entry.id !== id);
  await setItem(KEYS.history, next);
  return next;
}

/** Attaches a UV fluorescence observation to an existing scan (from the UV test screen). */
export async function setScanUvObservation(id: string, observation: UvObservation): Promise<ScanRecord[]> {
  const history = await getHistory();
  const next = history.map((entry) => (entry.id === id ? { ...entry, uvObservation: observation } : entry));
  await setItem(KEYS.history, next);
  return next;
}

// ---------------------------------------------------------------------------
// Standalone UV observations — logged without an associated photo scan
// ---------------------------------------------------------------------------

export interface UvLogEntry extends UvObservation {
  id: string;
}

const UV_LOG_KEY = "uv:logs";

export async function getUvLogs(): Promise<UvLogEntry[]> {
  return (await getItem<UvLogEntry[]>(UV_LOG_KEY)) ?? [];
}

export async function addUvLog(entry: Omit<UvLogEntry, "id">): Promise<UvLogEntry[]> {
  const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...entry }, ...(await getUvLogs())].slice(
    0,
    100,
  );
  await setItem(UV_LOG_KEY, next);
  return next;
}

// ---------------------------------------------------------------------------
// Saved (favourite) species and guides — stored as slug arrays
// ---------------------------------------------------------------------------

async function toggleInList(key: string, slug: string): Promise<string[]> {
  const list = (await getItem<string[]>(key)) ?? [];
  const next = list.includes(slug) ? list.filter((item) => item !== slug) : [slug, ...list];
  await setItem(key, next);
  return next;
}

export const getSavedSpecies = () => getItem<string[]>(KEYS.savedSpecies).then((v) => v ?? []);
export const toggleSavedSpecies = (slug: string) => toggleInList(KEYS.savedSpecies, slug);
export const getSavedGuides = () => getItem<string[]>(KEYS.savedGuides).then((v) => v ?? []);
export const toggleSavedGuide = (slug: string) => toggleInList(KEYS.savedGuides, slug);

// ---------------------------------------------------------------------------
// Field journal
// ---------------------------------------------------------------------------

export interface Sighting {
  id: string;
  title: string;
  speciesSlug: string | null;
  notes: string;
  imageUri: string | null;
  latitude: number | null;
  longitude: number | null;
  placeLabel: string | null;
  observedAt: string;
}

export async function getSightings(): Promise<Sighting[]> {
  return (await getItem<Sighting[]>(KEYS.journal)) ?? [];
}

export async function addSighting(sighting: Sighting): Promise<Sighting[]> {
  const next = [sighting, ...(await getSightings())];
  await setItem(KEYS.journal, next);
  return next;
}

export async function deleteSighting(id: string): Promise<Sighting[]> {
  const next = (await getSightings()).filter((entry) => entry.id !== id);
  await setItem(KEYS.journal, next);
  return next;
}

// ---------------------------------------------------------------------------
// Streak — one increment per calendar day the user completes an actual scan.
// Call this ONLY after a successful identifyGemstone() result (see the Scan
// screen); do not call it from app-open/launch effects or from unrelated
// activity like journaling, or the streak stops meaning "days you scanned".
// ---------------------------------------------------------------------------

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const today = () => new Date().toISOString().slice(0, 10);

const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

export async function getStreak(): Promise<Streak> {
  return (await getItem<Streak>(KEYS.streak)) ?? { current: 0, longest: 0, lastActiveDate: "" };
}

export async function touchStreak(): Promise<Streak> {
  const streak = await getStreak();
  const now = today();
  if (streak.lastActiveDate === now) return streak;

  const current = streak.lastActiveDate === yesterday() ? streak.current + 1 : 1;
  const next: Streak = {
    current,
    longest: Math.max(current, streak.longest),
    lastActiveDate: now,
  };
  await setItem(KEYS.streak, next);
  return next;
}

// ---------------------------------------------------------------------------
// Quiz stats
// ---------------------------------------------------------------------------

export interface QuizStats {
  played: number;
  bestScore: number;
  totalCorrect: number;
  totalAnswered: number;
}

export async function getQuizStats(): Promise<QuizStats> {
  return (
    (await getItem<QuizStats>(KEYS.quiz)) ?? { played: 0, bestScore: 0, totalCorrect: 0, totalAnswered: 0 }
  );
}

export async function recordQuiz(correct: number, answered: number): Promise<QuizStats> {
  const stats = await getQuizStats();
  const next: QuizStats = {
    played: stats.played + 1,
    bestScore: Math.max(stats.bestScore, correct),
    totalCorrect: stats.totalCorrect + correct,
    totalAnswered: stats.totalAnswered + answered,
  };
  await setItem(KEYS.quiz, next);
  return next;
}

/** A single saved quiz attempt, named by the user, for the leaderboard/history. */
export interface QuizAttempt {
  id: string;
  name: string;
  correct: number;
  total: number;
  date: string; // ISO timestamp of when it was saved
}

export async function getQuizAttempts(): Promise<QuizAttempt[]> {
  return (await getItem<QuizAttempt[]>(KEYS.quizAttempts)) ?? [];
}

/** Saves a named attempt (stamped with the current date/time). Keeps the last 100. */
export async function saveQuizAttempt(entry: { name: string; correct: number; total: number }): Promise<QuizAttempt[]> {
  const attempts = await getQuizAttempts();
  const record: QuizAttempt = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: entry.name,
    correct: entry.correct,
    total: entry.total,
    date: new Date().toISOString(),
  };
  const next = [record, ...attempts].slice(0, 100);
  await setItem(KEYS.quizAttempts, next);
  return next;
}

export async function deleteQuizAttempt(id: string): Promise<QuizAttempt[]> {
  const next = (await getQuizAttempts()).filter((a) => a.id !== id);
  await setItem(KEYS.quizAttempts, next);
  return next;
}

// ---------------------------------------------------------------------------
// Guest scan quota (mirrors the website's IP-based limit, but per-device)
// ---------------------------------------------------------------------------

interface GuestUsage {
  count: number;
  resetDate: string;
}

export async function guestScansUsed(): Promise<number> {
  const usage = await getItem<GuestUsage>(KEYS.guestScans);
  return usage && usage.resetDate === today() ? usage.count : 0;
}

export async function recordGuestScan(): Promise<number> {
  const used = await guestScansUsed();
  const next = used + 1;
  await setItem<GuestUsage>(KEYS.guestScans, { count: next, resetDate: today() });
  return next;
}

// ---------------------------------------------------------------------------
// Gemologist chat history (persists across app restarts)
// ---------------------------------------------------------------------------

/** Cap what we keep so the log can't grow without bound. */
const CHAT_HISTORY_LIMIT = 200;

/** The real conversation (excluding the local greeting), oldest → newest. */
export async function getChatMessages(): Promise<ChatMessage[]> {
  return (await getItem<ChatMessage[]>(KEYS.chat)) ?? [];
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  await setItem(KEYS.chat, messages.slice(-CHAT_HISTORY_LIMIT));
}

export async function clearChatMessages(): Promise<void> {
  await removeItem(KEYS.chat);
}

// ---------------------------------------------------------------------------
// Returning-user flag — "Welcome" the first time, "Welcome back" afterwards
// ---------------------------------------------------------------------------

/** True once the user has signed in at least once on this device. */
export async function isReturningUser(): Promise<boolean> {
  return (await getItem<boolean>(KEYS.returning)) === true;
}

export async function markReturningUser(): Promise<void> {
  await setItem(KEYS.returning, true);
}
