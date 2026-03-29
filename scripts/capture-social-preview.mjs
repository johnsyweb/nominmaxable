import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src/public/nominmaxable-social-preview.png");
const httpTimeoutMs = 90_000;
const contentTimeoutMs = 120_000;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : null;
      server.close(() => {
        if (port !== null) {
          resolve(port);
        } else {
          reject(new Error("Could not allocate a preview port"));
        }
      });
    });
    server.on("error", reject);
  });
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const p = spawn("pnpm", ["run", "build"], {
      cwd: root,
      stdio: "inherit",
    });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm run build exited with code ${code}`));
    });
  });
}

function startPreview(port) {
  return spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: root,
      stdio: "inherit",
    }
  );
}

async function waitForHttpOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        return;
      }
    } catch {
      /* try again */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function captureViewportPng(url, pathToPng) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("Could not launch Chromium. Run: pnpm exec playwright install chromium");
    throw err;
  }
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: httpTimeoutMs });
    await page.waitForSelector(".series-section", { timeout: contentTimeoutMs });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: pathToPng, type: "png" });
  } finally {
    await browser.close();
  }
}

function killPreview(proc) {
  if (proc.exitCode !== null) {
    return;
  }
  proc.kill("SIGTERM");
}

async function main() {
  await runBuild();
  const port = await getFreePort();
  const previewUrl = `http://127.0.0.1:${port}/nominmaxable/`;
  const preview = startPreview(port);
  try {
    await waitForHttpOk(previewUrl, httpTimeoutMs);
    await captureViewportPng(previewUrl, outPath);
    console.log(`Wrote ${path.relative(root, outPath)}`);
  } finally {
    killPreview(preview);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
