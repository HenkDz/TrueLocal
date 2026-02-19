#!/usr/bin/env node
/* global process, console */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const defaultLocalCli = path.resolve(projectRoot, "..", "TrueLocal", "dist", "cli.js");
const localCliOverride = process.env.TRUELOCAL_LOCAL_CLI;
const localCliPath = localCliOverride ? path.resolve(localCliOverride) : defaultLocalCli;

const args = process.argv.slice(2);

if (existsSync(localCliPath)) {
  const child = spawn(process.execPath, [localCliPath, ...args], {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (err) => {
    console.error(`Failed to run local trulocal CLI: ${err.message}`);
    process.exit(1);
  });
} else {
  const command = process.platform === "win32" ? "trulocal.cmd" : "trulocal";
  const child = spawn(command, args, {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (err) => {
    console.error(`Failed to run trulocal from PATH: ${err.message}`);
    process.exit(1);
  });
}
