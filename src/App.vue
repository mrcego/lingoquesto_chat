<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  //
</script>

<style>
  html {
    overflow-y: auto;
  }

  body {
    margin: 0;
    font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  }

  .v-application {
    font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif !important;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
</style>
