<script lang="ts" setup>
  import { useAppTheme } from '@/composables/useAppTheme';
  import { useChatStore } from '@/stores/chat.store';
  import { useRealtimeChat } from '@/composables/useRealtimeChat';

  const chatStore = useChatStore();
  const realtimeChat = useRealtimeChat();

  const drawer = ref(true);

  const unsubscribe = realtimeChat.onOnlineUsersUpdated((users) => {
    console.log(users);
    chatStore.setOnlineUsers(users);
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  const { currentThemeName, toggleTheme } = useAppTheme();

  const snackbar = ref(false);
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" color="background">
      <v-list density="compact" nav>
        <v-list-subheader>Usuarios en línea</v-list-subheader>
        <v-list-item
          v-for="user in chatStore.onlineUsers"
          :key="user.nickname"
          :title="user.nickname"
          :subtitle="user.online ? 'En línea' : 'Desconectado'"
          :class="{ 'bg-grey-lighten-4': user.nickname === chatStore.userNickname }"
        >
          <template v-slot:prepend>
            <v-badge color="success" dot :model-value="user.online" offset-x="-5" offset-y="-5">
              <v-avatar size="40" color="primary">
                <span class="text-white">
                  {{
                    user.nickname
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  }}
                </span>
              </v-avatar>
            </v-badge>
          </template>
        </v-list-item>
      </v-list>

      <template #prepend>
        <v-sheet class="pa-6 ga-1 align-center justify-center d-flex flex-column">
          <v-badge color="green" dot>
            <v-avatar size="64" color="secondary">
              <span class="text-h5 text-background">{{ chatStore.user.initials }}</span>
            </v-avatar>
          </v-badge>
          <span class="text-subtitle-1 font-weight-medium">{{ chatStore.user.nickname }}</span>
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
    <v-main>
      <router-view @on-error="snackbar = true" />
    </v-main>

    <AppFooter />
  </v-layout>

  <v-snackbar v-model="snackbar" location="top center" variant="elevated" color="info">
    <div class="text-subtitle-1 pb-2">¡Ups!</div>

    <p>Algo salió mal</p>

    <template v-slot:actions>
      <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
