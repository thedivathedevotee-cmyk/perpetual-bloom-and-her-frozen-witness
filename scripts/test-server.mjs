#!/usr/bin/env node
/* Focused checks for local-server access restrictions. */

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import net from 'node:net';
import test from 'node:test';
import { isBlockedRelativePath, isProtectedRelativePath } from './server-paths.mjs';

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
  const waitForStart = () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('local server did not start within 5 seconds')), 5000);
    const done = (callback) => (value) => {
      clearTimeout(timeout);
      child.stdout.off('data', started);
      child.off('error', failed);
      child.off('exit', exited);
      callback(value);
    };
    const started = done(resolve);
    const failed = done(reject);
    const exited = done((code) => reject(new Error(`local server exited before starting (${code})`)));
    child.stdout.once('data', started);
    child.once('error', failed);
    child.once('exit', exited);
  });
  try {
    await waitForStart();
    const request = (pathname, options) => fetch(`http://127.0.0.1:${port}${pathname}`, options);
    for (const pathname of ['/content/book.json', '/%63ontent/book.json', '/src/data/novel.txt', '/%73rc/data/novel.txt', '/data/book.json']) {
      assert.equal((await request(pathname)).status, 404, pathname);
    }
    assert.equal((await request('/data/book.enc.json')).status, 200);
    assert.equal((await request('/assets/js/gallery.js')).status, 200);
    assert.equal((await request('/', { method: 'HEAD' })).status, 200);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      if (!child.killed) child.kill('SIGTERM');
      const graceful = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 1000))
      ]);
      if (!graceful && child.exitCode === null) {
        const forced = once(child, 'exit');
        child.kill('SIGKILL');
        await forced;
      }
    }
  }
});

test('protected path matching is case-insensitive for Windows-compatible paths', () => {
  for (const pathname of [
    'content/book.json', 'CONTENT/book.json', 'Content/Book.json',
    'src/data/novel.txt', 'SRC/data/novel.txt', 'Src/Data/Novel.txt',
    'data/book.json', 'DATA/BOOK.JSON'
  ]) {
    assert.equal(isProtectedRelativePath(pathname), true, pathname);
  }
  assert.equal(isProtectedRelativePath('data/book.enc.json'), false);
  assert.equal(isProtectedRelativePath('assets/js/gallery.js'), false);
});

test('Windows trailing dot and space aliases are blocked before resolution', () => {
  for (const pathname of [
    'content./book.json', 'content /book.json', 'src./data/novel.txt',
    'src /data/novel.txt', 'data./book.json', 'assets /js/gallery.js'
  ]) {
    assert.equal(isBlockedRelativePath(pathname), true, pathname);
  }
  assert.equal(isBlockedRelativePath('assets/js/gallery.js'), false);
});
