<script lang="ts" setup>
  import { useAppTheme } from '@/composables/useAppTheme';

  const drawer = ref(true);
  const { currentThemeName, toggleTheme } = useAppTheme();

  const snackbar = ref(false);

  const items = ref([
    {
      title: 'Dashboard',
      prependIcon: 'mdi-view-dashboard-outline',
      link: true,
    },
    {
      title: 'Team',
      prependIcon: 'mdi-account-group',
      link: true,
    },
    {
      title: 'Projects',
      prependIcon: 'mdi-briefcase-outline',
      link: true,
    },
    {
      title: 'Calendar',
      prependIcon: 'mdi-calendar',
      link: true,
    },
    {
      title: 'Reports',
      prependIcon: 'mdi-file-chart-outline',
      link: true,
    },
  ]);
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" color="background">
      <v-list density="compact" item-props :items="items" nav />

      <template #prepend>
        <v-sheet class="pa-6 ga-1 align-center justify-center d-flex flex-column">
          <v-badge color="green" dot>
            <v-avatar size="64" color="secondary">
              <span class="text-h5 text-background">CG</span>
            </v-avatar>
          </v-badge>
          <span class="text-subtitle-1 font-weight-medium">Cesar Gómez</span>
        </v-sheet>
      </template>

      <template #append>
        <v-list-item class="ma-2" link nav prepend-icon="mdi-cog-outline" title="Settings" />
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
