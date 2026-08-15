const { spawn } = require('child_process');

const FULL_PATH = [
  'C:\\Program Files\\nodejs',
  'C:\\Users\\vansh\\AppData\\Local\\Programs\\Python\\Python312',
  'C:\\Users\\vansh\\AppData\\Local\\Programs\\Python\\Python312\\Scripts',
  'C:\\Users\\vansh\\AppData\\Local\\Microsoft\\WinGet\\Links',
  'C:\\Program Files\\Git\\cmd',
  'C:\\Windows\\System32',
  'C:\\Windows'
].join(';') + ';' + (process.env.PATH || '');

const p = spawn('C:\\Users\\vansh\\AppData\\Local\\Microsoft\\WinGet\\Links\\uvx.exe', [
  '--with', 'mcp<2',
  'mcp-server-git',
  '--repository', 'd:\\Projects\\ENR\\EmotionalNovelReader'
], {
  env: {
    ...process.env,
    PATH: FULL_PATH,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1'
  }
});

p.stdout.on('data', d => console.log('STDOUT:', d.toString()));
p.stderr.on('data', d => console.log('STDERR:', d.toString()));
p.on('close', c => console.log('CLOSED:', c));

const init = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }
}) + '\n';

p.stdin.write(init);

setTimeout(() => {
  p.kill();
}, 5000);
