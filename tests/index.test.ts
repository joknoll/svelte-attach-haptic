// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Haptic, haptic, useHaptic, defaultPatterns, type HapticOptions } from "../src";

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

  it("each preset has a non-empty pattern array", () => {
    for (const [, preset] of Object.entries(defaultPatterns)) {
      expect(Array.isArray(preset.pattern)).toBe(true);
      expect(preset.pattern.length).toBeGreaterThan(0);
    }
  });
});

describe("Haptic", () => {
  it("isSupported is a boolean", () => {
    expect(typeof Haptic.isSupported).toBe("boolean");
  });

  it("can be constructed with default args", () => {
    const h = new Haptic();
    expect(h).toBeInstanceOf(Haptic);
  });

  it("can be constructed with a preset name", () => {
    const h = new Haptic("success");
    expect(h).toBeInstanceOf(Haptic);
  });

  it("can be constructed with a number (duration)", () => {
    const h = new Haptic(100);
    expect(h).toBeInstanceOf(Haptic);
  });

  it("can be constructed with a number array", () => {
    const h = new Haptic([100, 50, 100]);
    expect(h).toBeInstanceOf(Haptic);
  });

  it("can be constructed with a Vibration array", () => {
    const h = new Haptic([
      { duration: 30, intensity: 0.5 },
      { delay: 60, duration: 40, intensity: 1 },
    ]);
    expect(h).toBeInstanceOf(Haptic);
  });

  it("can be constructed with a HapticPreset", () => {
    const h = new Haptic(defaultPatterns.success);
    expect(h).toBeInstanceOf(Haptic);
  });

  it("warns on unknown preset", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    new Haptic("nonexistent");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unknown preset"));
    warn.mockRestore();
  });

  it("trigger and cancel do not throw when unsupported", () => {
    const h = new Haptic("medium");
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
