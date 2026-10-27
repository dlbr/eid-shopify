import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

await mkdir("coverage", { recursive: true });
const child = spawn(process.execPath, [
  "--experimental-test-coverage",
  "--test-coverage-include=extensions/*/src/**",
  "--test-coverage-lines=90",
  "--test-coverage-branches=85",
  "--test-coverage-functions=90",
  "--test-reporter=spec", "--test-reporter-destination=stdout",
  "--test-reporter=lcov", "--test-reporter-destination=coverage/lcov.info",
  "--test", "tests/*.test.ts",
], { stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
