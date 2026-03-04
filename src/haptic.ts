import type { Attachment } from "svelte/attachments";

// ── Types ──────────────────────────────────────────────────────────────

export interface Vibration {
  duration: number;
  intensity?: number;
  delay?: number;
}

export type HapticPattern = number[] | Vibration[];

export interface HapticPreset {
  pattern: Vibration[];
}

export type HapticInput = number | string | HapticPattern | HapticPreset;

export type HapticEvents = [keyof HTMLElementEventMap, (keyof HTMLElementEventMap)?];

export interface HapticOptions {
  pattern?: HapticInput;
  events?: HapticEvents;
  intensity?: number;
}

// ── Patterns ───────────────────────────────────────────────────────────

export const defaultPatterns = {
  // Notification
  success: {
    pattern: [
      { duration: 30, intensity: 0.5 },
      { delay: 60, duration: 40, intensity: 1 },
    ],
  },
  warning: {
    pattern: [
      { duration: 40, intensity: 0.8 },
      { delay: 100, duration: 40, intensity: 0.6 },
    ],
  },
  error: {
    pattern: [
      { duration: 40, intensity: 0.9 },
      { delay: 40, duration: 40, intensity: 0.9 },
      { delay: 40, duration: 40, intensity: 0.9 },
    ],
  },

  // Impact
  light: { pattern: [{ duration: 15, intensity: 0.4 }] },
  medium: { pattern: [{ duration: 25, intensity: 0.7 }] },
  heavy: { pattern: [{ duration: 35, intensity: 1 }] },
  soft: { pattern: [{ duration: 40, intensity: 0.5 }] },
  rigid: { pattern: [{ duration: 10, intensity: 1 }] },

  // Selection
  selection: { pattern: [{ duration: 8, intensity: 0.3 }] },

  // Custom
  nudge: {
    pattern: [
      { duration: 80, intensity: 0.8 },
      { delay: 80, duration: 50, intensity: 0.3 },
    ],
  },
  buzz: { pattern: [{ duration: 1000, intensity: 1 }] },
} as const satisfies Record<string, HapticPreset>;

// ── Core vibration logic ───────────────────────────────────────────────

const MAX_PHASE_MS = 1000;
const PWM_CYCLE = 20;

function normalizeInput(input: HapticInput): Vibration[] | null {
  if (typeof input === "number") {
    return [{ duration: input }];
  }

  if (typeof input === "string") {
    const preset = defaultPatterns[input as keyof typeof defaultPatterns];
    if (!preset) {
      console.warn(`[svelte-attach-haptic] Unknown preset: "${input}"`);
      return null;
    }
    return preset.pattern.map((v) => ({ ...v }));
  }

  if (Array.isArray(input)) {
    if (input.length === 0) return [];

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

    return (input as Vibration[]).map((v) => ({ ...v }));
  }

  return input.pattern.map((v) => ({ ...v }));
}

function modulateVibration(duration: number, intensity: number): number[] {
  if (intensity >= 1) return [duration];
  if (intensity <= 0) return [];

  const onTime = Math.max(1, Math.round(PWM_CYCLE * intensity));
  const offTime = PWM_CYCLE - onTime;
  const result: number[] = [];

  let remaining = duration;
  while (remaining >= PWM_CYCLE) {
    result.push(onTime);
    result.push(offTime);
    remaining -= PWM_CYCLE;
  }
  if (remaining > 0) {
    const remOn = Math.max(1, Math.round(remaining * intensity));
    result.push(remOn);
    const remOff = remaining - remOn;
    if (remOff > 0) result.push(remOff);
  }

  return result;
}

function toVibratePattern(vibrations: Vibration[], defaultIntensity: number): number[] {
  const result: number[] = [];

  for (const vib of vibrations) {
    const intensity = Math.max(0, Math.min(1, vib.intensity ?? defaultIntensity));
    const delay = vib.delay ?? 0;

    if (delay > 0) {
      if (result.length > 0 && result.length % 2 === 0) {
        result[result.length - 1]! += delay;
      } else {
        if (result.length === 0) result.push(0);
        result.push(delay);
      }
    }

    const modulated = modulateVibration(vib.duration, intensity);

    if (modulated.length === 0) {
      if (result.length > 0 && result.length % 2 === 0) {
        result[result.length - 1]! += vib.duration;
      } else if (vib.duration > 0) {
        result.push(0);
        result.push(vib.duration);
      }
      continue;
    }

    for (const seg of modulated) {
      result.push(seg);
    }
  }

  return result;
}

// ── Haptic class ───────────────────────────────────────────────────────

export class Haptic {
  static readonly isSupported: boolean =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  private pattern: number[];

  constructor(input: HapticInput = "medium", intensity: number = 0.5) {
    const vibrations = normalizeInput(input);
    if (!vibrations || vibrations.length === 0) {
      this.pattern = [];
      return;
    }

    for (const vib of vibrations) {
      if (vib.duration > MAX_PHASE_MS) vib.duration = MAX_PHASE_MS;
    }

    this.pattern = toVibratePattern(vibrations, Math.max(0, Math.min(1, intensity)));
  }

  trigger(): void {
    if (Haptic.isSupported && this.pattern.length > 0) {
      navigator.vibrate(this.pattern);
    }
  }

  cancel(): void {
    if (Haptic.isSupported) {
      navigator.vibrate(0);
    }
  }
}

// ── Attachment ─────────────────────────────────────────────────────────

export function haptic(options: HapticOptions = {}): Attachment<HTMLElement> {
  return (element: HTMLElement) => {
    const { pattern: input = "medium", events = ["click"], intensity = 0.5 } = options;
    const [triggerEvent, cancelEvent] = events;

    const instance = new Haptic(input, intensity);

    const handleTrigger = () => instance.trigger();
    const handleCancel = () => instance.cancel();

    element.addEventListener(triggerEvent, handleTrigger);
    if (cancelEvent) {
      element.addEventListener(cancelEvent, handleCancel);
    }

    return () => {
      element.removeEventListener(triggerEvent, handleTrigger);
      if (cancelEvent) {
        element.removeEventListener(cancelEvent, handleCancel);
      }
    };
  };
}

// ── Factory ────────────────────────────────────────────────────────────

export function useHaptic(pattern?: HapticInput, events?: HapticEvents, intensity?: number) {
  return (overrides?: Partial<HapticOptions>): Attachment<HTMLElement> =>
    haptic({ pattern, events, intensity, ...overrides });
}
