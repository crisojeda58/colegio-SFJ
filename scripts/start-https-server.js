const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Verificar si los certificados existen
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('❌ Los certificados SSL no existen. Ejecuta primero: npm run setup-https');
  process.exit(1);
}

console.log('🚀 Iniciando servidor Next.js con HTTPS...');
console.log('🔐 Usando certificados SSL personalizados');
console.log('📁 Certificados ubicados en:', certDir);

// Iniciar Next.js con HTTPS
const nextProcess = spawn('npx', [
  'next',
  'dev',
  '--turbopack',
  '-p', '9002',
  '--experimental-https',
  '--experimental-https-key', keyPath,
  '--experimental-https-cert', certPath
], {
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (error) => {
  console.error('❌ Error iniciando el servidor:', error);
});

nextProcess.on('close', (code) => {
  console.log(`🔚 Servidor cerrado con código: ${code}`);
});

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  nextProcess.kill('SIGINT');
  process.exit(0);
});
