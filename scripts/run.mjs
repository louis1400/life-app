import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const commands = { dev: ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"], build: ["node_modules/vinext/dist/cli.js", "build"], start: ["node_modules/vinext/dist/cli.js", "start"], lint: ["node_modules/eslint/bin/eslint.js", ".", "--ignore-pattern", "dist", "--ignore-pattern", "modules/study/dist"], "db:generate": ["node_modules/drizzle-kit/bin.cjs", "generate"] };
const command = commands[process.argv[2]];
if (!command) throw Error("Choose dev, build, start, lint, or db:generate.");
mkdirSync(".wrangler", { recursive: true });
const child = spawn(process.execPath, [...command, ...process.argv.slice(3)], { stdio: "inherit", env: { ...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_LOG_PATH: ".wrangler/logs", MINIFLARE_REGISTRY_PATH: ".wrangler/registry" } });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
