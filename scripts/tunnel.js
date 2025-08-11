import { spawn } from 'child_process';

// Arrancar Vite
const vite = spawn('pnpm', ['vite', '--host', '--port', '5173'], {
  stdio: 'inherit',
  shell: true, // importante en Windows
});

// Arrancar Cloudflared
const tunnel = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:5173'], {
  stdio: 'inherit',
  shell: true,
});

process.on('exit', () => {
  vite.kill();
  tunnel.kill();
});
