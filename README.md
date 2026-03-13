# svelte-attach-haptic

A Svelte attachment for adding haptic feedback to elements using the [Svelte 5 attachments API](https://svelte.dev/docs/svelte/attachments).

Uses the Web Vibration API. Silently no-ops on unsupported platforms (desktop).

## Installation

```
npm install svelte-attach-haptic
```

## Example

```svelte
<script lang="ts">
  import { haptic, useHaptic } from "svelte-attach-haptic";

  const tap = useHaptic("medium", ["pointerdown"]);
</script>

<!-- Default: medium intensity on click -->
<button {@attach haptic()}>Default</button>

<!-- Built-in presets -->
<button {@attach haptic({ pattern: "success" })}>Success</button>
<button {@attach haptic({ pattern: "error" })}>Error</button>

<!-- Custom event trigger -->
<button {@attach haptic({ pattern: "heavy", events: ["pointerdown"] })}>Heavy on pointerdown</button>

<!-- Factory: create a reusable haptic with shared defaults -->
<button {@attach tap()}>Factory default</button>
<button {@attach tap({ pattern: "light" })}>Factory with override</button>
```

[Demo](https://joknoll.github.io/svelte-attach-haptic/) | [npm](https://www.npmjs.com/package/svelte-attach-haptic)

## API

### `haptic(options?)`

Svelte attachment that triggers haptic feedback on an element.

| Option      | Type                           | Default     | Description                          |
| ----------- | ------------------------------ | ----------- | ------------------------------------ |
| `pattern`   | `HapticInput`                  | `"medium"`  | Vibration pattern or preset name     |
| `events`    | `[triggerEvent, cancelEvent?]` | `["click"]` | DOM events to trigger/cancel haptics |
| `intensity` | `number`                       | `0.5`       | Global intensity override (0–1)      |

### `useHaptic(pattern?, events?, intensity?)`

Factory function that returns a reusable attachment with preset defaults. The returned function accepts optional overrides per element.

```svelte
<script lang="ts">
  import { useHaptic } from "svelte-attach-haptic";
  const tap = useHaptic("medium", ["pointerdown"]);
</script>

<button {@attach tap()}>Uses defaults</button>
<button {@attach tap({ pattern: "light" })}>Override pattern</button>
```

### `Haptic` class

For manual control outside of attachments:

```ts
import { Haptic } from "svelte-attach-haptic";

const h = new Haptic("success");
h.trigger();
h.cancel();
```

### `isSupported`

Boolean indicating whether the Web Vibration API is available.

### Built-in presets

| Preset        | Category     | Description                                              |
| ------------- | ------------ | -------------------------------------------------------- |
| `"light"`     | Impact       | Short, subtle tap (small toggle, minor interaction)      |
| `"medium"`    | Impact       | Standard tap (button press, card snap-to-position)       |
| `"heavy"`     | Impact       | Strong impact (major state change, force press)          |
| `"soft"`      | Impact       | Soft impact (gentle interaction)                         |
| `"rigid"`     | Impact       | Crisp impact (sharp, precise feedback)                   |
| `"selection"` | Selection    | Selection feedback (picker scroll, slider detent)        |
| `"success"`   | Notification | Success notification (form saved, payment confirmed)     |
| `"warning"`   | Notification | Warning notification (destructive action, limit reached) |
| `"error"`     | Notification | Error notification (validation failure, network error)   |
| `"nudge"`     | Other        | Double bump (attention grab)                             |
| `"buzz"`      | Other        | Long buzz                                                |

### Custom patterns

```ts
// Single duration (ms)
haptic({ pattern: 200 });

// Array of durations (vibrate, pause, vibrate, ...)
haptic({ pattern: [100, 50, 100] });

// Vibration objects with per-step intensity
haptic({
  pattern: [
    { duration: 50, intensity: 0.8 },
    { delay: 100, duration: 30, intensity: 0.4 },
  ],
});
```

## Design Guidelines

1. **Haptics supplement, never replace.** Always pair with visual feedback.
2. **Match intensity to significance.** Light interactions → `"light"`/`"selection"`. Standard → `"medium"`/`"success"`. Major → `"heavy"`/`"error"`/`"warning"`.
3. **Do not overuse.** Reserve for meaningful moments.
4. **Synchronize perfectly.** Fire haptic at the exact instant the visual change occurs.
5. **For async ops**, trigger when the result arrives:
   ```ts
   try {
     await submit();
     new Haptic("success").trigger();
   } catch {
     new Haptic("error").trigger();
   }
   ```
