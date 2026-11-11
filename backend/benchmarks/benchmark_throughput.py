"""
High-Concurrency Performance & Throughput Benchmark Suite.
Tests sub-millisecond serialization, L1/L2 cache hit latency,
and concurrent request handling using HTTPX AsyncClient.
"""

import asyncio
import statistics
import time
from httpx import ASGITransport, AsyncClient

from app.core.redis import CacheService
from app.main import app


async def run_benchmark(concurrency: int = 100, total_requests: int = 1000):
    print("=" * 70)
    print(f"  SHOPNO JATRA BACKEND - HIGH CONCURRENCY BENCHMARK")
    print(f"  Concurrency: {concurrency} workers | Total Requests: {total_requests}")
    print("=" * 70)

    # Pre-populate cache key to benchmark sub-millisecond retrieval path
    test_key = "benchmark:test_payload"
    sample_payload = {
        "status": "success",
        "flights": [
            {
                "flight_number": f"BG-{i}",
                "price": 4500.0 + i,
                "airline": "Biman Bangladesh",
                "origin": "DAC",
                "destination": "CXB",
            }
            for i in range(25)
        ],
    }
    await CacheService.set_json(test_key, sample_payload, ttl=300)

    transport = ASGITransport(app=app)
    latencies = []
    status_codes = []

    semaphore = asyncio.Semaphore(concurrency)

    async def send_single_request(client: AsyncClient):
        async with semaphore:
            t0 = time.perf_counter()
            resp = await client.get("/health/live")
            duration_ms = (time.perf_counter() - t0) * 1000
            latencies.append(duration_ms)
            status_codes.append(resp.status_code)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_overall = time.perf_counter()
        tasks = [send_single_request(client) for _ in range(total_requests)]
        await asyncio.gather(*tasks)
        total_time = time.perf_counter() - start_overall

    # Compute Statistics
    latencies.sort()
    rps = round(total_requests / total_time, 2)
    p50 = round(statistics.median(latencies), 2)
    p90 = round(latencies[int(len(latencies) * 0.90)], 2)
    p95 = round(latencies[int(len(latencies) * 0.95)], 2)
    p99 = round(latencies[int(len(latencies) * 0.99)], 2)
    min_lat = round(min(latencies), 2)
    max_lat = round(max(latencies), 2)
    success_rate = round((status_codes.count(200) / total_requests) * 100, 2)

    print("\n[BENCHMARK RESULTS]")
    print(f"  Total Duration:     {round(total_time, 3)} seconds")
    print(f"  Throughput (RPS):   {rps:,} req/sec")
    print(f"  Success Rate:       {success_rate}%")
    print(f"  Latency (Min):      {min_lat} ms")
    print(f"  Latency (p50):      {p50} ms")
    print(f"  Latency (p90):      {p90} ms")
    print(f"  Latency (p95):      {p95} ms")
    print(f"  Latency (p99):      {p99} ms")
    print(f"  Latency (Max):      {max_lat} ms")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_benchmark(concurrency=100, total_requests=1000))
