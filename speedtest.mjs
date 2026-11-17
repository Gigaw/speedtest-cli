#!/usr/bin/env node
// Measure download speed by fetching a URL several times in a row.
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// Download url fully; return { seconds, bytes }.
async function fetchOnce(url) {
  const start = performance.now();
  // identity: fetch would otherwise gunzip and we'd count unpacked bytes, not bytes on the wire.
  // close: fresh connection per request, same as Python's urllib (no keep-alive reuse).
  const headers = { "Cache-Control": "no-cache", "User-Agent": "speedtest-cli", "Accept-Encoding": "identity", Connection: "close" };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  let bytes = 0;
  for await (const chunk of res.body) bytes += chunk.length; // stream so big files don't fill RAM
  return { seconds: (performance.now() - start) / 1000, bytes };
}

// Run n sequential requests; return { times, total }.
export async function measure(url, n) {
  const times = [];
  let total = 0;
  for (let i = 1; i <= n; i++) {
    const { seconds, bytes } = await fetchOnce(url);
    times.push(seconds);
    total += bytes;
    console.log(`  #${String(i).padStart(2)}: ${seconds.toFixed(3)} s, ${(bytes / 1e6).toFixed(2)} MB`);
  }
  return { times, total };
}

function usageError(msg) {
  console.error(`usage: speedtest.mjs [-h] [-n N] url\nspeedtest.mjs: error: ${msg}`);
  process.exit(2);
}

async function main() {
  let args;
  try {
    args = parseArgs({ allowPositionals: true, options: { n: { type: "string", short: "n" }, help: { type: "boolean", short: "h" } } });
  } catch (e) {
    usageError(e.message);
  }
  if (args.values.help) {
    console.log("usage: speedtest.mjs [-h] [-n N] url\n\n  url   http(s) URL to download, e.g. a large image\n  -n N  number of requests (default: 10)");
    return;
  }
  if (args.positionals.length !== 1) usageError("exactly one URL is required");

  const url = args.positionals[0];
  let protocol;
  try {
    protocol = new URL(url).protocol;
  } catch {
    usageError("invalid URL");
  }
  if (protocol !== "http:" && protocol !== "https:") usageError("URL must start with http:// or https://");
  const raw = args.values.n ?? "10";
  if (!/^\d+$/.test(raw) || Number(raw) < 1) usageError("-n must be an integer >= 1"); // rejects 1.0, 1e1, 0x10 like Python's int()
  const n = Number(raw);

  console.log(`Downloading ${url} ${n} times...`);
  let times, total;
  try {
    ({ times, total } = await measure(url, n));
  } catch (e) {
    console.error(`Error: ${e.cause?.message ?? e.message}`); // fetch hides the real reason in e.cause
    process.exit(1);
  }

  const elapsed = times.reduce((a, b) => a + b, 0);
  console.log(`\nAverage request time: ${(elapsed / times.length).toFixed(3)} s`);
  console.log(`Total downloaded:     ${(total / 1e6).toFixed(2)} MB`);
  console.log(`Download speed:       ${((total * 8) / elapsed / 1e6).toFixed(2)} Mbit/s (${(total / elapsed / 1e6).toFixed(2)} MB/s)`);
}

// Run only when executed directly, not when imported by the test.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
