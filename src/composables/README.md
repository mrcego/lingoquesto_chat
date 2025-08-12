# Composables

This directory contains reusable Vue composables that encapsulate app logic.

- __Conventions__: Named `useXxx.ts` returning reactive state and methods.
- __Usage__: `import { useXxx } from '@/composables/useXxx'` inside `<script setup>`.

## Available composables

- __`useAppTheme()`__
  - __Purpose__: Manage dark/light theme with Vuetify and system preference.
  - __State__: `isDarkSchema`, `currentThemeName`, `isUsingSystemPreference`, `hasStoredPreference`.
  - __Methods__: `toggleTheme()`, `setTheme(dark?)`, `resetToSystemTheme()`, `initializeTheme()`.
  - __Notes__: Uses `usePreferredDark` and `useStorage` from VueUse, persists preference in `localStorage` under `isDarkSchema`.

- __`useRealtimeChat()`__
  - __Purpose__: Real-time chat integration using Firebase Realtime Database.
  - __State__: `connectionStatus`, `onlineUsers` (computed array), internal listeners.
  - __Methods__: `connect()`, `disconnect()`, `sendVoiceMessage(voiceMessage)`, `onOnlineUsersUpdated(cb)`, `cleanup()`, `base64ToBlob()`.
  - **Behavior**:
    - Tracks online/offline status in `status/{nickname}` with `serverTimestamp()`.
    - Listens to `messages` ordered by `timestamp`, maps to `VoiceMessage` objects, updates Pinia `chat.store`.
    - Handles reconnect logic and listener cleanup.

- __`useVoicePlayer()`__
  - __Purpose__: Audio playback for voice messages.
  - __State__: `currentAudio`, `isPlaying`, `currentMessageId`, `playbackRate`, `currentTime`, `duration`.
  - __Methods__: `playAudio(url, id)`, `pauseAudio()`, `resumeAudio()`, `stopAudio()`, `setPlaybackRate(rate)`, `isMessagePlaying(id)`.
  - __Notes__: Creates `Audio` element, updates reactive timings, and handles errors.

- __`useVoiceRecorder()`__
  - __Purpose__: Microphone recording with processing, validation, and chat integration.
  - __Core features__: Noise suppression, echo cancellation, compression, 30s max duration, validation for silence.
  - __Public API__: `startRecording()`, `stopRecording()`, `forceStop()`.
  - __Internals__: Web Audio pipeline (compressor/gain), `MediaRecorder`, blob processing, base64 conversion, duration detection with fallbacks, cleanup of tracks and `AudioContext`.
  - __Integrations__: Pinia `chat.store` (recording state, duration) and `useRealtimeChat()` (sending messages).

## Dependencies

- __Firebase__: See `@/firebase` for database setup used by `useRealtimeChat()`.
- __Pinia__: `src/stores/chat.store.ts` for chat state.
- __VueUse__: `usePreferredDark`, `useStorage` used in `useAppTheme()`.
- __Vuetify__: Theme management via `useTheme()`.

## Tooling

- __`unplugin-auto-import/vite`__ (see `vite.config.mts`):
  - Automatically imports Vue APIs (`ref`, `computed`, `onUnmounted`), Vue Router composables, VueUse utilities, and Pinia helpers.
  - Works in both `.ts` and Vue SFC templates (`vueTemplate: true`), reducing boilerplate in composables.

## Examples

```ts
<script setup lang="ts">
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'

const { startRecording, stopRecording } = useVoiceRecorder()

const onPress = async () => {
  await startRecording()
}
</script>
```
