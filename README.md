# svelte-attach-haptic

Add haptics to Svelte 5 components using the [attachments API](https://svelte.dev/docs/svelte/attachments).

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pattern` | `HapticInput` | `"medium"` | Vibration pattern or preset name |
| `events` | `[triggerEvent, cancelEvent?]` | `["click"]` | DOM events to trigger/cancel haptics |
| `intensity` | `number` | `0.5` | Global intensity override (0–1) |

### `useHaptic(pattern?, events?, intensity?)`

Factory function that returns a reusable attachment with preset defaults, which can be further overridden per element.

### `Haptic` class

Low-level class for manual control:

```ts
import { Haptic } from "svelte-attach-haptic";

const h = new Haptic("success");
h.trigger();
h.cancel();
```

### Built-in presets

| Preset | Description |
|--------|-------------|
| `"light"` | Short, subtle tap |
| `"medium"` | Standard tap |
| `"heavy"` | Strong impact |
| `"soft"` | Soft impact |
| `"rigid"` | Crisp impact |
| `"selection"` | Selection feedback |
| `"success"` | Success notification |
| `"warning"` | Warning notification |
| `"error"` | Error notification |
| `"nudge"` | Double bump |
| `"buzz"` | Long buzz |

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

[Demo](https://knolljo.github.io/svelte-attach-haptic/)

[npm Package](https://www.npmjs.com/package/svelte-attach-haptic)
