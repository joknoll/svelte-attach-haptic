import { on } from "svelte/events";
import type { Attachment } from "svelte/attachments";

// ── Types ──────────────────────────────────────────────────────────────

export interface Vibration {
  duration: number;
  intensity?: number;
  delay?: number;
}

export type HapticPattern = number[] | Vibration[];

export type HapticInput = number | string | HapticPattern;

export type HapticEvents = [keyof HTMLElementEventMap, (keyof HTMLElementEventMap)?];

export interface HapticOptions {
  pattern?: HapticInput;
  events?: HapticEvents;
  intensity?: number;
}

// ── Presets ─────────────────────────────────────────────────────────────

export const defaultPatterns = {
  // Notification
  success: [
    { duration: 30, intensity: 0.5 },
    { delay: 60, duration: 40, intensity: 1 },
  ],
  warning: [
    { duration: 40, intensity: 0.8 },
    { delay: 100, duration: 40, intensity: 0.6 },
  ],
  error: [
    { duration: 40, intensity: 0.9 },
    { delay: 40, duration: 40, intensity: 0.9 },
    { delay: 40, duration: 40, intensity: 0.9 },
  ],

  // Impact
  light: [{ duration: 15, intensity: 0.4 }],
  medium: [{ duration: 25, intensity: 0.7 }],
  heavy: [{ duration: 35, intensity: 1 }],
  soft: [{ duration: 40, intensity: 0.5 }],
  rigid: [{ duration: 10, intensity: 1 }],

  // Selection
  selection: [{ duration: 8, intensity: 0.3 }],

  // Custom
  nudge: [
    { duration: 80, intensity: 0.8 },
    { delay: 80, duration: 50, intensity: 0.3 },
  ],
  buzz: [{ duration: 1000, intensity: 1 }],
} as const satisfies Record<string, Vibration[]>;

// ── Helpers ──────────────────────────────────────────────────────────────

const MAX_PHASE_MS = 1000;
const PWM_CYCLE_MS = 20;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Resolve any supported input format into a normalized Vibration array.
 * Returns null only if a string preset name is not found.
 */
function resolveVibrations(input: HapticInput): Vibration[] | null {
  // Single duration: e.g. createPattern(100)
  if (typeof input === "number") {
    return [{ duration: input }];
  }

  // Preset name: e.g. createPattern("success")
  if (typeof input === "string") {
    const preset = defaultPatterns[input as keyof typeof defaultPatterns];
    if (!preset) {
      console.warn(`[svelte-attach-haptic] Unknown preset: "${input}"`);
      return null;
    }
    return preset.map((v) => ({ ...v }));
  }

  // Empty array
  if (input.length === 0) return [];

  // Number array (Web Vibration API format): [vibrate, pause, vibrate, pause, ...]
  if (typeof input[0] === "number") {
    const nums = input as number[];
    const vibrations: Vibration[] = [];
    for (let i = 0; i < nums.length; i += 2) {
      const delay = i > 0 ? nums[i - 1]! : 0;
      vibrations.push({
        ...(delay > 0 && { delay }),
        duration: nums[i]!,
      });
    }
    return vibrations;
  }

  // Vibration array: e.g. [{ duration: 30, intensity: 0.5 }, ...]
  return (input as Vibration[]).map((v) => ({ ...v }));
}

/**
 * Simulate variable intensity using PWM (pulse-width modulation).
 * Full intensity returns a single on segment. Zero intensity returns nothing.
 */
function modulateIntensity(duration: number, intensity: number): number[] {
  if (intensity >= 1) return [duration];
  if (intensity <= 0) return [];

  const onTime = Math.max(1, Math.round(PWM_CYCLE_MS * intensity));
  const offTime = PWM_CYCLE_MS - onTime;
  const segments: number[] = [];

  let remaining = duration;
  while (remaining >= PWM_CYCLE_MS) {
    segments.push(onTime, offTime);
    remaining -= PWM_CYCLE_MS;
  }

  if (remaining > 0) {
    const partialOn = Math.max(1, Math.round(remaining * intensity));
    segments.push(partialOn);
    const partialOff = remaining - partialOn;
    if (partialOff > 0) segments.push(partialOff);
  }

  return segments;
}

/**
 * Append a pause to the vibrate pattern.
 * If the pattern ends on a pause slot, extend it instead of adding new entries.
 */
function appendPause(pattern: number[], ms: number): void {
  if (ms <= 0) return;

  if (pattern.length > 0 && pattern.length % 2 === 0) {
    // Last entry is a pause — extend it
    pattern[pattern.length - 1]! += ms;
  } else {
    // Need to open a new pause slot (preceded by a zero-vibrate if the array is empty)
    if (pattern.length === 0) pattern.push(0);
    pattern.push(ms);
  }
}

/**
 * Convert a Vibration array into the flat number[] format expected by
 * the Web Vibration API: [vibrate, pause, vibrate, pause, ...].
 */
function buildVibratePattern(vibrations: Vibration[], defaultIntensity: number): number[] {
  const result: number[] = [];

  for (const vib of vibrations) {
    const intensity = clamp01(vib.intensity ?? defaultIntensity);

    appendPause(result, vib.delay ?? 0);

    const segments = modulateIntensity(vib.duration, intensity);

    if (segments.length === 0) {
      // Zero intensity — treat the entire duration as a pause
      appendPause(result, vib.duration);
      continue;
    }

    for (const seg of segments) {
      result.push(seg);
    }
  }

  return result;
}

// ── Public API ───────────────────────────────────────────────────────────

/** Whether the Web Vibration API is available in the current environment. */
export const isSupported: boolean =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * Resolve a haptic input into a flat vibrate pattern (number[]).
 * Returns an empty array if the input is invalid or unknown.
 */
export function createPattern(input: HapticInput = "medium", intensity: number = 0.5): number[] {
  const vibrations = resolveVibrations(input);
  if (!vibrations || vibrations.length === 0) return [];

  for (const vib of vibrations) {
    if (vib.duration > MAX_PHASE_MS) vib.duration = MAX_PHASE_MS;
  }

  return buildVibratePattern(vibrations, clamp01(intensity));
}

/** Fire a pre-built vibrate pattern. No-op if the Vibration API is unavailable. */
export function triggerHaptic(pattern: number[]): void {
  if (isSupported && pattern.length > 0) {
    navigator.vibrate(pattern);
  }
}

/** Cancel any active vibration. No-op if the Vibration API is unavailable. */
export function cancelHaptic(): void {
  if (isSupported) {
    navigator.vibrate(0);
  }
}

// ── Haptic class ─────────────────────────────────────────────────────────

/** Convenience class for manual haptic control. */
export class Haptic {
  static readonly isSupported = isSupported;

  private readonly pattern: number[];

  constructor(input: HapticInput = "medium", intensity: number = 0.5) {
    this.pattern = createPattern(input, intensity);
  }

  trigger(): void {
    triggerHaptic(this.pattern);
  }

  cancel(): void {
    cancelHaptic();
  }
}

// ── Svelte Attachment ────────────────────────────────────────────────────

/** Svelte attachment that triggers haptic feedback on DOM events. */
export function haptic(options: HapticOptions = {}): Attachment<HTMLElement> {
  return (element: HTMLElement) => {
    const { pattern: input = "medium", events = ["click"], intensity = 0.5 } = options;
    const [triggerEvent, cancelEvent] = events;

    const vibratePattern = createPattern(input, intensity);

    const offTrigger = on(element, triggerEvent, () => triggerHaptic(vibratePattern));
    const offCancel = cancelEvent ? on(element, cancelEvent, () => cancelHaptic()) : null;

    return () => {
      offTrigger();
      offCancel?.();
    };
  };
}

// ── Factory ──────────────────────────────────────────────────────────────

/** Create a reusable haptic attachment factory with preset defaults. */
export function useHaptic(pattern?: HapticInput, events?: HapticEvents, intensity?: number) {
  return (overrides?: Partial<HapticOptions>): Attachment<HTMLElement> =>
    haptic({ pattern, events, intensity, ...overrides });
}
