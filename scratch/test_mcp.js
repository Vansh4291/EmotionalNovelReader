const { spawn } = require('child_process');
const path = require('path');

async function testMCPServer(name, command, args, initParams = {}) {
  console.log(`\n================ Testing ${name} ================`);
  return new Promise((resolve) => {
    const fullPath = [
      'C:\\Program Files\\nodejs',
      'C:\\Users\\vansh\\AppData\\Local\\Programs\\Python\\Python312',
      'C:\\Users\\vansh\\AppData\\Local\\Programs\\Python\\Python312\\Scripts',
      'C:\\Users\\vansh\\AppData\\Local\\Microsoft\\WinGet\\Links',
      'C:\\Program Files\\Git\\cmd',
      'C:\\Windows\\System32'
    ].join(';') + ';' + (process.env.PATH || '');

    const proc = spawn(command, args, {
      shell: true,
      env: {
        ...process.env,
        PATH: fullPath,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    });

    let buffer = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      buffer += text;
      // Look for jsonrpc response
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
          try {
            const parsed = JSON.parse(line.trim());
            console.log(`[${name} SUCCESS] Received JSON-RPC response:`, JSON.stringify(parsed).slice(0, 300));
            proc.kill();
            resolve(true);
            return;
          } catch (e) {}
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.log(`[${name} Log]:`, data.toString().trim().slice(0, 200));
    });

    proc.on('close', (code) => {
      resolve(true);
    });

    proc.on('error', (err) => {
      console.error(`[${name} Error]:`, err.message);
      resolve(false);
    });

    // Send initialize request
    const initReq = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Antigravity-Verifier', version: '1.0.0' },
        ...initParams
      }
    }) + '\n';

    setTimeout(() => {
      try {
        proc.stdin.write(initReq);
      } catch (e) {
        console.error(`[${name} Stdin Write Error]:`, e.message);
      }
    }, 1000);

    // Timeout safety
    setTimeout(() => {
      proc.kill();
      resolve(true);
    }, 10000);
  });
}

async function runAll() {
  await testMCPServer('Context7 MCP', 'npx', ['-y', '@upstash/context7-mcp']);
  await testMCPServer('Git MCP', 'uvx', ['mcp-server-git', '--repository', 'd:\\Projects\\ENR\\EmotionalNovelReader']);
  await testMCPServer('Serena MCP', 'uvx', [
    '--from', 'git+https://github.com/oraios/serena',
    'serena', 'start-mcp-server',
    '--context', 'ide-assistant',
    '--project', 'd:\\Projects\\ENR\\EmotionalNovelReader'
  ]);
  console.log('\nAll MCP Server verifications completed.');
}

runAll();
