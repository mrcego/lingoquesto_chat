# Components

Vue template files in this folder are automatically imported.

## 🚀 Usage

Importing is handled by [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components). This plugin automatically imports `.vue` files created in the `src/components` directory, and registers them as global components. This means that you can use any component in your application without having to manually import it.

The following example assumes a component located at `src/components/MyComponent.vue`:

```vue
<template>
  <div>
    <MyComponent />
  </div>
</template>

<script lang="ts" setup>
  //
</script>
```

When your template is rendered, the component's import will automatically be inlined, which renders to this:

```vue
<template>
  <div>
    <MyComponent />
  </div>
</template>

<script lang="ts" setup>
  import MyComponent from '@/components/MyComponent.vue'
</script>
```

## Available components

- __`AppFooter.vue`__
  - __Purpose__: App footer with author link.
  - __Props__: none
  - __Slots__: none

- __`VoiceRecorder.vue`__
  - __Purpose__: Press-and-hold voice recording UI integrated with chat store.
  - __Depends on__: `useVoiceRecorder()` from `src/composables/` and Pinia `chat.store`.
  - __Emits__: `onError` when microphone access fails.
  - __Key UX__: Button press to record, timer display, validation/permission alerts.

- __`VoiceMessage.vue`__
  - __Purpose__: Displays a voice message bubble with play/pause, waveform, and speed control.
  - __Props__:
    - `message: VoiceMessage` (see `src/types/chat.ts`)
  - __Depends on__: `useVoicePlayer()` for playback control.
  - __Behavior__: Generates object URL from base64 audio data; shows duration and progress.

## Notes

- Components use Vuetify 3 UI primitives (e.g., `v-btn`, `v-card`, `v-menu`). Ensure Vuetify is configured as in `vite.config.mts`.
- Auto-registration means the tag name matches the file name by default, e.g., `VoiceRecorder` for `VoiceRecorder.vue`.

## Tooling

- __`unplugin-vue-components/vite`__ (see `vite.config.mts`):
  - Auto-registers components from `src/components/`, so you can use `<VoiceRecorder />` without manual imports.
  - Reduces boilerplate and keeps templates clean; supports tree-shaking of used components.
- __`unplugin-auto-import/vite`__ (see `vite.config.mts`):
  - Auto-imports commonly used APIs like `ref`, `computed`, Pinia helpers (`defineStore`, `storeToRefs`), Vue Router composables, and VueUse utilities.
  - Enables usage in both scripts and Vue templates (`vueTemplate: true`).
