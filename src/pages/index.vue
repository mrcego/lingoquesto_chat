<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useChatStore } from '@/stores/chat.store';
  import { useRouter } from 'vue-router';

  import { useRealtimeChat } from '@/composables/useRealtimeChat';

  const router = useRouter();
  const chatStore = useChatStore();

  const { connect } = useRealtimeChat();

  const name = ref('');
  const lastname = ref('');

  const errorMessage = ref('');
  const isLoading = ref(false);
  const hasAudioSupport = ref(true);
  const form = ref();

  const fieldRules = [
    (v: string) => !!v || 'Debes ingresar información aquí  ',
    (v: string) => (v && v.length >= 2) || 'Mínimo 2 caracteres',
    (v: string) => (v && v.length <= 20) || 'Máximo 20 caracteres',
    (v: string) => /^[a-zA-Z0-9_\-\s]+$/.test(v) || 'Solo letras, números, guiones y espacios',
  ];

  const handleLogin = async () => {
    const { valid } = await form.value.validate();
    if (!valid) return;

    errorMessage.value = '';
    isLoading.value = true;

    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      chatStore.login(`${name.value} ${lastname.value}`);

      // Connect to Firebase after successful login
      connect();
    } catch (error) {
      errorMessage.value = 'Error al acceder al micrófono. Por favor, permite el acceso.';
      console.error('Microphone access error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(() => {
    // Check audio support
    hasAudioSupport.value = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  });
</script>

<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" style="min-height: 100vh">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="login-card" elevation="12" rounded="lg">
          <v-card-title class="text-center pa-8">
            <v-icon color="primary" size="64" class="mb-4">mdi-microphone</v-icon>
            <h1 class="text-h4 font-weight-bold text-primary">LingoQuesto Voice Chat</h1>
          </v-card-title>

          <v-card-text class="px-8 pb-8">
            <v-form @submit.prevent="handleLogin" ref="form">
              <v-text-field
                v-model="name"
                label="Tu nombre"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                :rules="fieldRules"
                :error-messages="errorMessage"
                class="mb-4"
                autofocus
              />

              <v-text-field
                v-model="lastname"
                label="Tu apellido"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                :rules="fieldRules"
                :error-messages="errorMessage"
                class="mb-4"
                @keyup.enter="handleLogin"
              />

              <v-btn
                type="submit"
                color="secondary"
                size="large"
                block
                :loading="isLoading"
                class="mb-4 text-none"
                elevation="4"
              >
                <v-icon left>mdi-login</v-icon>
                Entrar al Chat
              </v-btn>
            </v-form>

            <v-alert v-if="!hasAudioSupport" type="warning" variant="tonal" class="mt-4">
              <v-icon>mdi-alert</v-icon>
              Tu navegador no soporta grabación de audio
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .login-container {
    background: linear-gradient(135deg, #2b2f4b 100%, #b6643a 100%);
    min-height: 100vh;
  }

  .gradient-text {
    background: linear-gradient(135deg, #2b2f4b 100%, #b6643a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
