# LingoQuesto Chat
 
Aplicación web construida con Vue 3, Vite, TypeScript y Vuetify. El entorno de desarrollo se expone a Internet usando un túnel de Cloudflare para facilitar pruebas y demostraciones remotas con una URL pública segura.
 
## Descripción

LingoQuesto Chat es un entorno de pruebas para un chat/front-end en Vue 3 con Vuetify. Incluye un script que levanta Vite y abre un túnel temporal con Cloudflare (`cloudflared`) para compartir una URL pública mientras desarrollas en local.

## Requisitos

- Node.js 18+ (recomendado 20+)
- pnpm instalado globalmente (el script de dev usa `pnpm vite`)
  - Instalar: `npm i -g pnpm`
- Dependencias del proyecto instaladas: `pnpm install`
- Cloudflared está incluido como devDependency y se ejecuta con `npx`.
  - Verificar instalación: `npx cloudflared --version`

## Instalación

```bash
pnpm install
```

## Uso (desarrollo con túnel)

```bash
pnpm dev
```

Esto ejecuta `scripts/tunnel.js`, que:

- Levanta Vite en `http://localhost:5173` (con HMR).
- Abre un túnel con Cloudflared apuntando a ese puerto y mostrará en consola una URL `https://...` para compartir. Es importante esta herramienta para usar el microfono y probar la funcionalidad, ya que solo se pueda habilitar en entornos seguros.

Notas:

- En Windows se usa `shell: true` para compatibilidad de procesos.
- Si usas `npm`/`yarn`, asegúrate de tener `pnpm` igualmente instalado porque el script invoca `pnpm vite`.

## Scripts disponibles

- `pnpm dev`: arranca Vite y el túnel de Cloudflare (`scripts/tunnel.js`).
- `pnpm build`: compila el proyecto para producción.
- `pnpm preview`: sirve la build localmente.
- `pnpm type-check`: verificación de tipos con `vue-tsc`.
- `pnpm lint`: corre ESLint con `--fix`.

## Personalizar puerto del dev server

Edita `scripts/tunnel.js` y cambia los argumentos de `pnpm vite --port 5173` y el `--url http://localhost:5173` de cloudflared por el puerto deseado.

## Solución de problemas

- Puerto 5173 en uso: cierra procesos previos o cambia el puerto en `scripts/tunnel.js`.
- `pnpm` no encontrado: instala globalmente con `npm i -g pnpm`.
- `cloudflared` no encontrado: ejecuta `pnpm install` y prueba `npx cloudflared --version`.

## Licencia

MIT
