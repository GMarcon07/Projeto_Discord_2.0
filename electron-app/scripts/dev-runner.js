const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForVite() {
  return new Promise((resolve) => {
    const check = () => {
      http.get('http://localhost:5173', (res) => {
        resolve();
      }).on('error', () => {
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function start() {
  console.log('[DEV-RUNNER] A aguardar pelo servidor Vite na porta 5173...');
  await waitForVite();
  console.log('[DEV-RUNNER] Vite ativo! A compilar e iniciar Electron...');

  // Build electron main & preload
  const tsc = spawn('npx', ['tsc', '-p', 'electron/tsconfig.json'], {
    shell: true,
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  tsc.on('close', (code) => {
    if (code !== 0) {
      console.error('[DEV-RUNNER] Falha na compilação do Electron');
      return;
    }

    console.log('[DEV-RUNNER] A lançar janela Electron...');
    const electron = spawn('npx', ['electron', '.'], {
      shell: true,
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173'
      }
    });

    electron.on('close', () => {
      process.exit();
    });
  });
}

start();
