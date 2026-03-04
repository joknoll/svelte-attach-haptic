# svelte-attach-haptic

Add haptics to Svelte 5 components using the [attachments API](https://svelte.dev/docs/svelte/attachments).

Uses the Web Vibration API. Silently no-ops on unsupported platforms (desktop). No error handling or feature detection needed.

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

## API

### `haptic(options?)`

Svelte attachment that triggers haptic feedback on an element.

| Option      | Type                           | Default     | Description                          |
|--------     |------                          |---------    |-------------                         |
| `pattern`   | `HapticInput`                  | `"medium"`  | Vibration pattern or preset name     |
| `events`    | `[triggerEvent, cancelEvent?]` | `["click"]` | DOM events to trigger/cancel haptics |
| `intensity` | `number`                       | `0.5`       | Global intensity override (0–1)      |

### `useHaptic(pattern?, events?, intensity?)`

Factory function that returns a reusable attachment with preset defaults. The returned function accepts optional overrides per element:

```svelte
<script lang="ts">
  import { useHaptic } from "svelte-attach-haptic";
  const tap = useHaptic("medium", ["pointerdown"]);
</script>

<button {@attach tap()}>Uses defaults</button>
<button {@attach tap({ pattern: "light" })}>Override pattern</button>
```

### Haptic class

For manual control:

```ts
import { Haptic } from "svelte-attach-haptic";

const h = new Haptic("success");
h.trigger();
h.cancel();
```

### `isSupported`

Boolean indicating whether the Web Vibration API is available:

```svelte
<script lang="ts">
  import { isSupported } from "svelte-attach-haptic";
</script>

{#if isSupported}
  <p>Haptics available</p>
{/if}
```

### Built-in presets

| Preset        | Category     | Description                                              |
|--------       |-----------   |-----------                                               |
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
haptic({ pattern: 200 })

// Array of durations (vibrate, pause, vibrate, ...)
haptic({ pattern: [100, 50, 100] })

// Vibration objects with per-step intensity
haptic({ pattern: [
  { duration: 50, intensity: 0.8 },
  { delay: 100, duration: 30, intensity: 0.4 },
] })
```

## Design Guidelines

UX guidelines for haptic feedback:

1. **Haptics supplement, never replace.** Always pair with visual feedback. UI must work fully without haptics.
2. **Build causal relationships.** The haptic must feel like a direct physical consequence of the user action.
3. **Match intensity to significance.** Light interactions = `"light"`/`"selection"`. Standard = `"medium"`/`"success"`. Major = `"heavy"`/`"error"`/`"warning"`.
4. **Do not overuse.** If every tap vibrates, nothing feels special. Reserve for meaningful moments only.
5. **Synchronize perfectly.** Fire haptic at the exact instant the visual change occurs.
6. **Respect conventions.** `"success"` = positive, `"error"` = negative, `"warning"` = cautionary, `"selection"` = discrete ticks only.
7. **For async ops**, trigger when the result arrives, synced with the visual state change:
   ```ts
   import { Haptic } from "svelte-attach-haptic";
   try {
     await submit();
     new Haptic("success").trigger();
   } catch {
     new Haptic("error").trigger();
   }
   ```

### Quick reference

| Interaction                | Preset        |
|----------------------------|---------------|
| Primary button tap         | `"medium"`    |
| Secondary button           | `"light"`     |
| Form success               | `"success"`   |
| Validation / network error | `"error"`     |
| Toggle switch              | `"light"`     |
| Delete before confirm      | `"warning"`   |
| Picker / wheel             | `"selection"` |
| Slider detents             | `"selection"` |
| Tab switch                 | `"selection"` |
| Drag-drop snap             | `"medium"`    |
| Long press                 | `"heavy"`     |
| Modal appear               | `"medium"`    |
| Pull-to-refresh threshold  | `"light"`     |
| Swipe dismiss threshold    | `"light"`     |
| Payment confirmed          | `"success"`   |

### Anti-patterns

- Haptic on every tap (fatigue)
- `"error"` for non-errors (breaks conventions)
- Haptic without visual feedback (some devices cannot vibrate)
- Haptic on page load or passive scroll (invasive)
- `"heavy"` for minor interactions (jarring)
- Long continuous vibrations (use brief transient pulses, not `"buzz"` for UI feedback)

---

[Demo](https://knolljo.github.io/svelte-attach-haptic/) | [npm](https://www.npmjs.com/package/svelte-attach-haptic)
