<script setup lang="ts">
  import { useChatStore } from '@/stores/chat.store';

  import { useRealtimeChat } from '@/composables/useRealtimeChat';

  // The chat store
  const chatStore = useChatStore();
  // The login function from the chat store
  const { login } = chatStore;

  // The connect function from the useRealtimeChat composable
  const { connect } = useRealtimeChat();

  // The name input field
  const name = ref('');
  // The lastname input field
  const lastname = ref('');

  // The error message to display
  const errorMessage = ref('');
  // Whether the login button is loading
  const isLoading = ref(false);
  // Whether the browser supports audio
  const hasAudioSupport = ref(true);
  // The form element
  const form = ref();

  // The rules for the name and lastname fields
  const fieldRules = [
    (v: string) => !!v || 'Debes ingresar información aquí  ',
    (v: string) => (v && v.length >= 2) || 'Mínimo 2 caracteres',
    (v: string) => (v && v.length <= 20) || 'Máximo 20 caracteres',
    (v: string) => /^[a-zA-Z0-9_\-\s]+$/.test(v) || 'Solo letras, números, guiones y espacios',
  ];

  // The function to handle the login form submission
  const handleLogin = async () => {
    // Validate the form
    const { valid } = await form.value.validate();
    if (!valid) return;

    // Clear any previous error messages
    errorMessage.value = '';
    // Set the loading state
    isLoading.value = true;

    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      // Login with the username
      login(`${name.value.trim()} ${lastname.value.trim()}`);

      // Connect to Firebase after successful login
      await connect();
    } catch (error) {
      // Display any error messages
      errorMessage.value = 'Error al acceder al micrófono. Por favor, permite el acceso.';
      console.error('Microphone access error:', error);
    } finally {
      // Clear the loading state
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
            <v-icon color="primary" class="mb-2 mb-md-4" :size="$vuetify.display.mobile ? 48 : 64">
              mdi-microphone
            </v-icon>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-primary">LingoQuesto Voice Chat</h1>
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
