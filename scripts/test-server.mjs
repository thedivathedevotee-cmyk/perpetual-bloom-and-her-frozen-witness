#!/usr/bin/env node
/* Focused checks for local-server access restrictions. */

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import net from 'node:net';
import test from 'node:test';

async function unusedPort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

test('local server blocks decoded plaintext paths without blocking reader assets', async () => {
  const port = await unusedPort();
  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await once(child.stdout, 'data');
    const request = (pathname, options) => fetch(`http://127.0.0.1:${port}${pathname}`, options);
    for (const pathname of ['/content/book.json', '/%63ontent/book.json', '/src/data/novel.txt', '/%73rc/data/novel.txt', '/data/book.json']) {
      assert.equal((await request(pathname)).status, 404, pathname);
    }
    assert.equal((await request('/data/book.enc.json')).status, 200);
    assert.equal((await request('/assets/js/gallery.js')).status, 200);
    assert.equal((await request('/', { method: 'HEAD' })).status, 200);
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});
