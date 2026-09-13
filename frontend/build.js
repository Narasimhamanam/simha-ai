import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const viteBin = resolve("./node_modules/vite/bin/vite.js");
const args = ["--max-old-space-size=4096", viteBin, ...process.argv.slice(2)];

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    RAYON_NUM_THREADS: "1",
    NODE_OPTIONS: "--max-old-space-size=4096",
  },
});

process.exit(result.status ?? 0);
