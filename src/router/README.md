# Router

This directory configures the application router.

- __Entry file__: `src/router/index.ts`
- __History mode__: HTML5 history via `createWebHistory(import.meta.env.BASE_URL)`
- __Routes source__: Automatically generated from `src/pages/**/*.vue` using `vue-router/auto` and `vue-router/auto-routes` (virtual modules from the `unplugin-vue-router` Vite plugin).
- __Layouts__: Applied with `setupLayouts` from `virtual:generated-layouts` (virtual module provided by `vite-plugin-vue-layouts-next`).

## How it works

The router is created with virtual modules that are generated at build/dev time by the routing plugin:

- `routes` from `vue-router/auto-routes` (via `unplugin-vue-router`) is a route array derived from files in `src/pages/`.
- `setupLayouts(routes)` from `virtual:generated-layouts` (via `vite-plugin-vue-layouts-next`) decorates the routes with layout metadata.
- `createRouter({ history, routes })` wires everything up and is exported as the default router instance.

```ts
// src/router/index.ts (excerpt)
import { createRouter, createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})
```

## Adding routes

- __Create a page__: Add a Vue SFC under `src/pages/` (e.g., `src/pages/about.vue`). A route will be generated automatically.
- __Nested routes__: Use nested directories, e.g., `src/pages/dashboard/index.vue` -> `/dashboard`.
- __Dynamic routes__: Use bracket syntax, e.g., `src/pages/users/[id].vue` -> `/users/:id`.
- __Catch-all__: `src/pages/[...path].vue` -> `/:path(.*)`.

Refer to `unplugin-vue-router` documentation for the exact conventions supported by `vue-router/auto`.

## Generated routes (current project)

From files in `src/pages/`:

- `src/pages/index.vue`
  - __Path__: `/`
  - __Name__: `index`

- `src/pages/chats.vue`
  - __Path__: `/chats`
  - __Name__: `chats`

Note: Route names are inferred by `unplugin-vue-router` and may vary if you customize its options.

## Using layouts

Layouts are applied via `setupLayouts` from `virtual:generated-layouts` (provided by `vite-plugin-vue-layouts-next`). Note: the function name is `setupLayouts` (plural), matching the import used in `src/router/index.ts`. Define layouts (commonly in `src/layouts/`) and annotate pages with the desired layout according to your layout plugin’s conventions. Example (script setup with route meta):

 __Default layout__: The Vite config sets `defaultLayout: 'auth'`, so pages without an explicit layout use `auth` by default.

```ts
// vite.config.mts (excerpt)
import Layouts from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    Layouts({
      defaultLayout: 'auth',
    }),
  ],
})
```

__Layout files location__: Place layout components in `src/layouts/`, e.g.:

- `src/layouts/auth.vue`
- `src/layouts/default.vue`

The layout name used in page meta (e.g., `layout: 'auth'`) must match the file name (without extension).

__Per-page layout__: Set the layout on a page via route meta. Two common patterns:

```vue
<!-- src/pages/login.vue -->
<script setup lang="ts">
// vite-plugin-vue-layouts-next reads this meta
export const routeMeta = { layout: 'auth' }
</script>
```

or using a `<route>` block:

```vue
<!-- src/pages/login.vue -->
<route lang="yaml">
meta:
  layout: auth
</route>
```

```vue
<script setup lang="ts">
// Example: define the layout name on the page component
// export const routeMeta = { layout: 'default' }
</script>
```

## Programmatic navigation

Use the standard Vue Router APIs:

```ts
import { useRouter } from 'vue-router'

const router = useRouter()
router.push({ name: 'home' })
```

## Typed routes and navigation

`unplugin-vue-router` generates type definitions (see `vite.config.mts`: `dts: 'src/typed-router.d.ts'`). You can use the typed APIs by importing from `vue-router/auto`:

```ts
import { useRouter } from 'vue-router/auto'

const router = useRouter()
// Example: navigate by typed route name
router.push({ name: 'chats' })

// If a route has params, TypeScript will enforce them, e.g.:
// router.push({ name: 'users-id', params: { id: '123' } })
```

## Dynamic import error workaround

`index.ts` includes a guard for a known Vite dynamic import issue. If a chunk fails to load, the app will attempt one reload and store a flag in `localStorage` to avoid loops.

- __Key__: `vuetify:dynamic-reload`
- __Behavior__: On first failure, sets the key and reloads; on second failure, logs an error without reloading again.

```ts
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})
```

## Environment base URL

`import.meta.env.BASE_URL` is used to generate the history base. Ensure it matches your deploy base path if the app is served from a subdirectory.

## Files

- `index.ts` — Router creation, layouts setup, error workaround.
