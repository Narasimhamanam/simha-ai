process.env.RAYON_NUM_THREADS = "1";
process.env.NODE_OPTIONS = "--max-old-space-size=4096";
await import("./node_modules/vite/bin/vite.js");
