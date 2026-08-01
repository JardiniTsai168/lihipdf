import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "out");
const distDir = path.join(projectRoot, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(path.join(distDir, "server"), { recursive: true });
await mkdir(path.join(distDir, ".openai"), { recursive: true });
await cp(outDir, path.join(distDir, "static"), { recursive: true });
await cp(
  path.join(projectRoot, "scripts", "sites-static-server.cjs"),
  path.join(distDir, "server", "index.js")
);
await cp(path.join(projectRoot, ".openai", "hosting.json"), path.join(distDir, ".openai", "hosting.json"));
