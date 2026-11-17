import assert from "node:assert";
import http from "node:http";
import test from "node:test";
import { measure } from "./speedtest.mjs";

test("counts all bytes of all requests", async (t) => {
  const body = Buffer.alloc(100_000, "x");
  const server = http.createServer((req, res) => res.end(body));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  t.mock.method(console, "log", () => {});

  const { times, total } = await measure(`http://127.0.0.1:${server.address().port}/`, 3);

  assert.strictEqual(total, 300_000);
  assert.strictEqual(times.length, 3);
  assert.ok(times.every((s) => s > 0));
});
