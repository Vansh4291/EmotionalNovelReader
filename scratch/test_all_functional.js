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

function runMCPRpc(name, command, args, requests, timeoutMs = 30000) {
  return new Promise((resolve) => {
    console.log(`\n================ [STARTING] ${name} ================`);
    const proc = spawn(command, args, {
      shell: true,
      env: {
        ...process.env,
        PATH: FULL_PATH,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    });

    let buffer = '';
    const responses = [];
    let currentReqIndex = 0;

    function sendNextRequest() {
      if (currentReqIndex >= requests.length) return;
      const req = requests[currentReqIndex];
      const payload = JSON.stringify(req) + '\n';
      try {
        proc.stdin.write(payload);
      } catch (err) {
        console.error(`[${name} STDIN ERROR]`, err.message);
      }
      currentReqIndex++;
    }

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep partial

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
          const json = JSON.parse(trimmed);
          responses.push(json);

          if (json.id === 1) {
            proc.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized'
            }) + '\n');
            sendNextRequest();
          } else if (currentReqIndex < requests.length) {
            sendNextRequest();
          }
        } catch (e) {}
      }
    });

    proc.stderr.on('data', (data) => {
      // console.log(`[${name} STDERR]`, data.toString().trim().slice(0, 150));
    });

    proc.on('close', (code) => {
      resolve({ name, success: responses.length >= requests.length, responses, code });
    });

    proc.on('error', (err) => {
      console.error(`[${name} ERROR]`, err.message);
      resolve({ name, success: false, error: err.message });
    });

    // Start with initialize
    setTimeout(() => {
      sendNextRequest();
    }, 500);

    setTimeout(() => {
      proc.kill();
      resolve({ name, success: responses.length >= requests.length, responses, timedOut: true });
    }, timeoutMs);
  });
}

async function runComprehensiveTests() {
  console.log('=== Starting Real Functional Verification of All MCP Servers ===');

  // 1. Context7 Functional Test
  console.log('\n--- 1. Testing Context7 MCP Live Documentation Query ---');
  const context7Reqs = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'HealthCheck', version: '1.0.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'resolve-library-id',
        arguments: {
          libraryName: 'zustand',
          query: 'state management store'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'query-docs',
        arguments: {
          libraryId: '/pmndrs/zustand',
          query: 'create store hooks'
        }
      }
    }
  ];
  const c7Result = await runMCPRpc('Context7 MCP', 'npx', ['-y', '@upstash/context7-mcp'], context7Reqs, 20000);
  console.log('Context7 Success:', c7Result.success, `(Received ${c7Result.responses.length}/${context7Reqs.length} responses)`);
  for (const resp of c7Result.responses) {
    if (resp.id === 2) {
      console.log('  -> Tools available:', JSON.stringify(resp.result?.tools, null, 2));
    }
    if (resp.id === 3) console.log('  -> resolve-library-id result:', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 200));
    if (resp.id === 4) console.log('  -> query-docs result (sample):', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 200));
  }

  // 2. Git MCP Functional Test
  console.log('\n--- 2. Testing Git MCP Live Repository Operations ---');
  const gitReqs = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'HealthCheck', version: '1.0.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'git_status',
        arguments: {
          repo_path: 'd:\\Projects\\ENR\\EmotionalNovelReader'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'git_log',
        arguments: {
          repo_path: 'd:\\Projects\\ENR\\EmotionalNovelReader',
          max_count: 3
        }
      }
    }
  ];
  const gitResult = await runMCPRpc('Git MCP', 'uvx', [
    '--with', '"mcp<2"',
    'mcp-server-git',
    '--repository', 'd:\\Projects\\ENR\\EmotionalNovelReader'
  ], gitReqs, 20000);
  console.log('Git MCP Success:', gitResult.success, `(Received ${gitResult.responses.length}/${gitReqs.length} responses)`);
  for (const resp of gitResult.responses) {
    if (resp.id === 2) console.log('  -> Tools available:', resp.result?.tools?.map(t => t.name));
    if (resp.id === 3) console.log('  -> git_status result:', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 150));
    if (resp.id === 4) console.log('  -> git_log result:', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 200));
  }

  // 3. Serena MCP Functional Test
  console.log('\n--- 3. Testing Serena MCP Live Symbol Retrieval & Analysis ---');
  const serenaReqs = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'HealthCheck', version: '1.0.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_symbols_overview',
        arguments: {
          relative_path: 'backend/app.js'
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'find_symbol',
        arguments: {
          name_path_pattern: 'bookRoutes',
          relative_path: 'backend/app.js'
        }
      }
    }
  ];
  const serenaResult = await runMCPRpc('Serena MCP', 'uvx', [
    '--from', 'git+https://github.com/oraios/serena',
    'serena', 'start-mcp-server',
    '--context', 'ide-assistant',
    '--project', 'd:\\Projects\\ENR\\EmotionalNovelReader'
  ], serenaReqs, 25000);
  console.log('Serena Success:', serenaResult.success, `(Received ${serenaResult.responses.length}/${serenaReqs.length} responses)`);
  for (const resp of serenaResult.responses) {
    if (resp.id === 2) console.log('  -> Tools count:', resp.result?.tools?.length);
    if (resp.id === 3) console.log('  -> get_symbols_overview result (symbols in backend/app.js):', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 200));
    if (resp.id === 4) console.log('  -> find_symbol (bookRoutes) result:', JSON.stringify(resp.result?.content?.[0]?.text || resp.result).slice(0, 200));
  }

  console.log('\n================ ALL FUNCTIONAL MCP TESTS COMPLETED ================');
}

runComprehensiveTests();
