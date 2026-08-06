#!/usr/bin/env node
/**
 * Runs automatically before `npm run dev` (see package.json "predev").
 *
 * nodemon silently swallows EADDRINUSE: it logs a crash and then idles
 * "waiting for file changes" instead of exiting. If a previous backend
 * process is still bound to the port, every subsequent nodemon restart
 * is a no-op and your code changes appear to have no effect.
 *
 * This script checks the port up front:
 *  - if a stale `node` process owns it, kill it and continue.
 *  - if something else owns it, fail loudly with instructions instead
 *    of letting nodemon fail silently later.
 */
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3001;

function findOwnerWindows(port) {
  let out;
  try {
    out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
  } catch {
    return null;
  }
  const line = out
    .split('\n')
    .find((l) => l.includes(`:${port} `) && l.toUpperCase().includes('LISTENING'));
  if (!line) return null;
  const pid = line.trim().split(/\s+/).pop();
  if (!pid || !/^\d+$/.test(pid)) return null;

  let name = '';
  try {
    const csv = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
    name = csv.split(',')[0]?.replace(/"/g, '') || '';
  } catch {
    // tasklist failed; proceed without a name
  }
  return { pid, name };
}

function findOwnerPosix(port) {
  let pid;
  try {
    pid = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim().split('\n')[0];
  } catch {
    return null;
  }
  if (!pid) return null;

  let name = '';
  try {
    name = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
  } catch {
    // ps failed; proceed without a name
  }
  return { pid, name };
}

const owner = process.platform === 'win32' ? findOwnerWindows(PORT) : findOwnerPosix(PORT);

if (!owner) {
  process.exit(0); // Port is free.
}

const isNode = /node/i.test(owner.name);

if (isNode) {
  console.log(
    `[check-port] Port ${PORT} is already held by a stale node process (PID ${owner.pid}). Killing it before starting...`
  );
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${owner.pid} /F`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${owner.pid}`, { stdio: 'ignore' });
    }
    console.log(`[check-port] Killed PID ${owner.pid}. Continuing startup.`);
    process.exit(0);
  } catch (err) {
    console.error(`[check-port] Failed to kill PID ${owner.pid}:`, err.message);
    process.exit(1);
  }
} else {
  console.error(
    `\n[check-port] Port ${PORT} is already in use by "${owner.name || 'an unknown process'}" (PID ${owner.pid}), and it doesn't look like a stale dev server.\n` +
      `Refusing to start so nodemon doesn't fail silently. Free the port and try again, e.g.:\n` +
      (process.platform === 'win32'
        ? `  taskkill /PID ${owner.pid} /F\n`
        : `  kill -9 ${owner.pid}\n`) +
      `Or set a different port: PORT=3002 npm run dev\n`
  );
  process.exit(1);
}
