"""
Prometheus Observability, Latency Histograms & Performance Metrics.
Exposes real-time throughput, p50/p95/p99 latencies, cache ratios, and connection pool telemetry.
"""

import time
from typing import Callable
from fastapi import Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# 1. Latency Histogram (p50, p90, p95, p99 monitoring)
HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint", "status_code"],
    buckets=[0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

# 2. Total Request Throughput Counter
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests processed",
    ["method", "endpoint", "status_code"],
)

# 3. Hybrid Cache Telemetry
CACHE_OPERATIONS = Counter(
    "cache_operations_total",
    "Cache lookups partitioned by tier and outcome",
    ["tier", "operation", "status"],  # tier: l1, l2 | status: hit, miss, set
)

# 4. Fintech Webhook Settlement Latency
PAYMENT_SETTLEMENT_DURATION = Histogram(
    "payment_webhook_settlement_seconds",
    "Latency of atomic webhook processing (booking + commission + loyalty)",
    ["provider", "status"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0],
)

# 5. Active Database Pool Gauges
DB_POOL_ACTIVE_CONNECTIONS = Gauge(
    "db_pool_active_connections",
    "Current active database connections checked out from asyncpg pool",
)


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    """Measures latency and throughput across every incoming request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip metrics endpoint to avoid self-measurement loop
        if request.url.path == "/metrics":
            return await call_next(request)

        start_time = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration = time.perf_counter() - start_time
            # Normalize path for high-cardinality protection
            endpoint = request.url.path
            if endpoint.startswith("/api/v1/bookings/"):
                endpoint = "/api/v1/bookings/{id}"
            elif endpoint.startswith("/api/v1/hotels/"):
                endpoint = "/api/v1/hotels/{id}"
            elif endpoint.startswith("/api/v1/flights/"):
                endpoint = "/api/v1/flights/{id}"

            HTTP_REQUEST_DURATION.labels(
                method=request.method,
                endpoint=endpoint,
                status_code=status_code,
            ).observe(duration)

            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                endpoint=endpoint,
                status_code=status_code,
            ).inc()


def metrics_endpoint() -> Response:
    """FastAPI endpoint serving Prometheus text format."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
