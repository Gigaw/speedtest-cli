import functools
import http.server
import tempfile
import threading
import unittest
from pathlib import Path

import speedtest


class MeasureTest(unittest.TestCase):
    def test_counts_all_bytes_of_all_requests(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "file.bin").write_bytes(b"x" * 100_000)
            handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=d)
            handler.log_message = lambda *a: None
            server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                url = f"http://127.0.0.1:{server.server_port}/file.bin"
                times, total = speedtest.measure(url, 3)
            finally:
                server.shutdown()
        self.assertEqual(total, 300_000)
        self.assertEqual(len(times), 3)
        self.assertTrue(all(t > 0 for t in times))


if __name__ == "__main__":
    unittest.main()
