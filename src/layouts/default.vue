<script lang="ts" setup>
  /**
   * This component is the main layout of the app.
   * It contains the navigation drawer with the list of online users,
   * the app bar with the theme toggle button, and the main content area.
   */

  import { useChatStore } from '@/stores/chat.store';

  import { useAppTheme } from '@/composables/useAppTheme';
  import { useRealtimeChat } from '@/composables/useRealtimeChat';

  import { getInitials } from '@/utils';

  const chatStore = useChatStore();
  const { userNickname, onlineUsers } = storeToRefs(chatStore);

  const { currentThemeName, toggleTheme } = useAppTheme();
  const { connectionStatus, onOnlineUsersUpdated, connect } = useRealtimeChat();

  /**
   * Whether the navigation drawer is open or not
   */
  const drawer = ref(true);

  /**
   * Whether the snackbar is open or not
   */
  const snackbar = ref(false);

  /**
   * Whether the user is connected or not
   */
  const isConnected = ref(false);

  let unsubscribe: (() => void) | null = null;

  /**
   * Sets up the listener for online users
   */
  const setupUsersListener = () => {
    if (unsubscribe) {
      unsubscribe();
    }

    console.log('Setting up users listener...');

    unsubscribe = onOnlineUsersUpdated((users) => {
      console.log(
        '👥 Users update received:',
        users.map((user) => `${user.nickname}: ${user.online ? '🟢' : '🔴'}`)
      );
      chatStore.setOnlineUsers(users);
    });
  };

  /**
   * Connects the user to the Firebase Realtime Database
   */
  const connectUser = async () => {
    if (!userNickname.value) {
      console.log('❌ No user nickname available for connection');
      return;
    }

    try {
      console.log('🔌 Connecting user:', userNickname.value);

      // Set up listener BEFORE connecting
      setupUsersListener();

      // Connect
      await connect();
      isConnected.value = true;

      console.log('✅ User connected successfully');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      isConnected.value = false;
    }
  };

  // Watch for changes in the login status
  watch(
    () => chatStore.isUserLoggedIn,
    (isLoggedIn) => {
      console.log('👤 User login status changed:', isLoggedIn);
      if (isLoggedIn && chatStore.userNickname) {
        connectUser();
      } else if (!isLoggedIn) {
        isConnected.value = false;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }
    },
    { immediate: true }
  );

  // Watch for changes in the connection status
  watch(
    () => connectionStatus.value,
    (status) => {
      console.log('🔗 Connection status changed:', status);
      isConnected.value = status === 'connected';
    }
  );

  // Clean up the listener when the component is unmounted
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

<template>
  <!-- This is the main layout of the app -->
  <v-layout>
    <!-- Navigation drawer -->
    <v-navigation-drawer v-model="drawer" color="background">
      <v-list density="compact" nav>
        <v-list-subheader>Usuarios en línea</v-list-subheader>
        <v-list-item
          v-if="onlineUsers.length > 0"
          v-for="user in onlineUsers"
          :key="user.nickname"
          :title="user.nickname"
          :subtitle="user.online ? 'En línea' : 'Desconectado'"
        >
          <template v-slot:prepend>
            <v-badge color="green" dot :model-value="user.online" offset="-3">
              <v-avatar size="40" color="accent">
                <span class="text-white">
                  {{ getInitials(user.nickname) }}
                </span>
              </v-avatar>
            </v-badge>
          </template>
        </v-list-item>

        <v-list-item v-else>
          <v-list-item-title class="text-center">Sólo tú estás en línea</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #prepend>
        <v-sheet class="pa-6 ga-1 align-center justify-center d-flex flex-column">
          <v-badge color="green" dot :model-value="isConnected">
            <v-avatar size="64" color="secondary">
              <span class="text-h5 text-background">{{ getInitials(userNickname) }}</span>
            </v-avatar>
          </v-badge>
          <span class="text-subtitle-1 font-weight-medium">{{ userNickname }}</span>
          <span class="text-caption text-medium-emphasis">
            {{
              isConnected
                ? 'En línea'
                : connectionStatus === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'
            }}
          </span>
        </v-sheet>
      </template>

      <template #append>
        <v-list-item
          class="ma-2"
          link
          nav
          prepend-icon="mdi-logout"
          title="Cerrar sesión"
          @click="chatStore.logout()"
        />
      </template>
    </v-navigation-drawer>

    <!-- App bar -->
    <v-app-bar border="b" class="ps-4" flat color="background">
      <v-app-bar-nav-icon @click="drawer = !drawer" />

      <v-app-bar-title>LingoQuesto Chat</v-app-bar-title>

      <template #append>
        <v-btn plain icon @click="toggleTheme">
          <v-icon v-if="currentThemeName === 'customDark'">mdi-white-balance-sunny</v-icon>
          <v-icon v-else>mdi-moon-waning-crescent</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Main content area -->
    <v-main>
      <router-view @on-error="snackbar = true" />
    </v-main>

    <!-- Footer -->
    <AppFooter />
  </v-layout>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" location="top center" variant="elevated" color="info">
    <div class="text-subtitle-1 pb-2">¡Ups!</div>

    <p>Algo salió mal</p>

    <template v-slot:actions>
      <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
