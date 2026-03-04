// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  isSupported,
  createPattern,
  triggerHaptic,
  cancelHaptic,
  Haptic,
  haptic,
  useHaptic,
  defaultPatterns,
  type HapticOptions,
} from "../src";

describe("defaultPatterns", () => {
  it("contains all expected presets", () => {
    const expected = [
      "success",
      "warning",
      "error",
      "light",
      "medium",
      "heavy",
      "soft",
      "rigid",
      "selection",
      "nudge",
      "buzz",
    ];
    expect(Object.keys(defaultPatterns)).toEqual(expected);
  });

  it("each preset is a non-empty Vibration array", () => {
    for (const [, vibrations] of Object.entries(defaultPatterns)) {
      expect(Array.isArray(vibrations)).toBe(true);
      expect(vibrations.length).toBeGreaterThan(0);
    }
  });
});

describe("isSupported", () => {
  it("is a boolean", () => {
    expect(typeof isSupported).toBe("boolean");
  });
});

describe("createPattern()", () => {
  it("returns an array with default args", () => {
    expect(Array.isArray(createPattern())).toBe(true);
  });

  it("accepts a preset name", () => {
    expect(Array.isArray(createPattern("success"))).toBe(true);
  });

  it("accepts a number (duration)", () => {
    expect(Array.isArray(createPattern(100))).toBe(true);
  });

  it("accepts a number array", () => {
    expect(Array.isArray(createPattern([100, 50, 100]))).toBe(true);
  });

  it("accepts a Vibration array", () => {
    const pattern = createPattern([
      { duration: 30, intensity: 0.5 },
      { delay: 60, duration: 40, intensity: 1 },
    ]);
    expect(Array.isArray(pattern)).toBe(true);
  });

  it("returns empty array for unknown preset", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = createPattern("nonexistent");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unknown preset"));
    expect(result).toEqual([]);
    warn.mockRestore();
  });
});

describe("triggerHaptic() and cancelHaptic()", () => {
  it("do not throw when called", () => {
    const pattern = createPattern("medium");
    expect(() => triggerHaptic(pattern)).not.toThrow();
    expect(() => cancelHaptic()).not.toThrow();
  });
});

describe("Haptic class", () => {
  it("isSupported matches the standalone export", () => {
    expect(Haptic.isSupported).toBe(isSupported);
  });

  it("can be constructed with default args", () => {
    expect(new Haptic()).toBeInstanceOf(Haptic);
  });

  it("trigger() and cancel() do not throw", () => {
    const h = new Haptic("success");
    expect(() => h.trigger()).not.toThrow();
    expect(() => h.cancel()).not.toThrow();
  });
});

describe("haptic()", () => {
  it("returns an attachment function", () => {
    const attachment = haptic();
    expect(typeof attachment).toBe("function");
  });

  it("attachment binds and unbinds event listeners", () => {
    const attachment = haptic({ pattern: "light", events: ["pointerdown"] });
    const el = document.createElement("button");
    const addSpy = vi.spyOn(el, "addEventListener");
    const removeSpy = vi.spyOn(el, "removeEventListener");

    const cleanup = attachment(el);
    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));

    cleanup!();
    expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
  });

  it("attachment binds cancel event when provided", () => {
    const attachment = haptic({
      pattern: "buzz",
      events: ["pointerdown", "pointerup"],
    });
    const el = document.createElement("button");
    const addSpy = vi.spyOn(el, "addEventListener");

    const cleanup = attachment(el);
    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));

    cleanup!();
  });

  it("uses defaults when no options provided", () => {
    const attachment = haptic();
    const el = document.createElement("button");
    const addSpy = vi.spyOn(el, "addEventListener");

    attachment(el);
    expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function));
  });
});

describe("useHaptic()", () => {
  it("returns a factory function", () => {
    const factory = useHaptic("medium", ["click"]);
    expect(typeof factory).toBe("function");
  });

  it("factory returns an attachment", () => {
    const factory = useHaptic("medium", ["click"]);
    const attachment = factory();
    expect(typeof attachment).toBe("function");
  });

  it("factory accepts overrides", () => {
    const factory = useHaptic("medium", ["click"]);
    const attachment = factory({ pattern: "heavy" });
    const el = document.createElement("button");
    const cleanup = attachment(el);
    expect(typeof cleanup).toBe("function");
    cleanup!();
  });
});
