#!/usr/bin/env python3
"""Measure download speed by fetching a URL several times in a row."""
import argparse
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def fetch(url, timeout=60):
    """Download url fully; return (seconds, bytes)."""
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "speedtest-cli"})
    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        size = len(resp.read())
    return time.perf_counter() - start, size


def measure(url, n):
    """Run n sequential requests; return (list of seconds, total bytes)."""
    times, total = [], 0
    for i in range(1, n + 1):
        t, size = fetch(url)
        times.append(t)
        total += size
        print(f"  #{i:>2}: {t:.3f} s, {size / 1e6:.2f} MB")
    return times, total


def main():
    p = argparse.ArgumentParser(description="Measure download speed for a URL.")
    p.add_argument("url", help="http(s) URL to download, e.g. a large image")
    p.add_argument("-n", type=int, default=10, help="number of requests (default: 10)")
    args = p.parse_args()

    if urllib.parse.urlparse(args.url).scheme not in ("http", "https"):
        p.error("URL must start with http:// or https://")
    if args.n < 1:
        p.error("-n must be >= 1")

    print(f"Downloading {args.url} {args.n} times...")
    try:
        times, total = measure(args.url, args.n)
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"Error: {e}")

    elapsed = sum(times)
    print(f"\nAverage request time: {elapsed / len(times):.3f} s")
    print(f"Total downloaded:     {total / 1e6:.2f} MB")
    print(f"Download speed:       {total * 8 / elapsed / 1e6:.2f} Mbit/s ({total / elapsed / 1e6:.2f} MB/s)")


if __name__ == "__main__":
    main()
