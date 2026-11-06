"""
Unit tests for Intelligent Read-Write Database Connection Splitting & SQLAlchemy 2.0 Routing.
Validates:
- Primary routing for POST, PUT, DELETE, PATCH HTTP contexts.
- Primary routing for financial row locks (SELECT ... FOR UPDATE).
- Round-robin load-balancing across Read-Replicas for GET / read-only queries.
- Read-Your-Own-Writes monotonic consistency pinning to Primary after mutations.
- Explicit context manager overrides (use_primary_node, use_replica_node).
"""

import asyncio
import pytest
from sqlalchemy import Integer, String, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.database import (
    RoutingSession,
    current_request_method,
    session_routing_override,
    use_primary_node,
    use_replica_node,
)


class RoutingTestBase(DeclarativeBase):
    pass


class SampleEntity(RoutingTestBase):
    __tablename__ = "sample_entities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


@pytest.fixture
async def multi_node_cluster(monkeypatch):
    """Set up 1 primary engine and 2 replica engines for verification."""
    primary_eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    replica_1 = create_async_engine("sqlite+aiosqlite:///:memory:")
    replica_2 = create_async_engine("sqlite+aiosqlite:///:memory:")

    # Create schema across all engines
    for eng in (primary_eng, replica_1, replica_2):
        async with eng.begin() as conn:
            await conn.run_sync(RoutingTestBase.metadata.create_all)

    # Patch database module globals
    import app.core.database as db_mod
    monkeypatch.setattr(db_mod, "primary_engine", primary_eng)
    monkeypatch.setattr(db_mod, "replica_engines", [replica_1, replica_2])

    test_sessionmaker = async_sessionmaker(
        sync_session_class=RoutingSession,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    yield {
        "primary": primary_eng,
        "replica_1": replica_1,
        "replica_2": replica_2,
        "sessionmaker": test_sessionmaker,
    }

    for eng in (primary_eng, replica_1, replica_2):
        await eng.dispose()


@pytest.mark.asyncio
async def test_read_queries_load_balance_across_replicas(multi_node_cluster):
    """GET requests and read queries should cycle across replica_1 and replica_2."""
    sm = multi_node_cluster["sessionmaker"]
    primary_sync = multi_node_cluster["primary"].sync_engine
    replica_1_sync = multi_node_cluster["replica_1"].sync_engine
    replica_2_sync = multi_node_cluster["replica_2"].sync_engine

    current_request_method.set("GET")
    try:
        async with sm() as session:
            # Query 1
            stmt1 = select(SampleEntity)
            bind1 = session.sync_session.get_bind(clause=stmt1)
            assert bind1 in (replica_1_sync, replica_2_sync)

            # Query 2 (should balance to the next replica)
            stmt2 = select(SampleEntity)
            bind2 = session.sync_session.get_bind(clause=stmt2)
            assert bind2 in (replica_1_sync, replica_2_sync)
            assert bind1 != bind2, "Consecutive reads must round-robin between replicas"
    finally:
        current_request_method.set(None)


@pytest.mark.asyncio
async def test_financial_lock_routes_to_primary(multi_node_cluster):
    """SELECT ... FOR UPDATE must always route to the Primary engine regardless of HTTP method."""
    sm = multi_node_cluster["sessionmaker"]
    primary_sync = multi_node_cluster["primary"].sync_engine

    # Even in a GET context, a financial lock requires Primary
    current_request_method.set("GET")
    try:
        async with sm() as session:
            stmt = select(SampleEntity).with_for_update()
            bind = session.sync_session.get_bind(clause=stmt)
            assert bind == primary_sync, "SELECT ... FOR UPDATE must bind to Primary engine"
    finally:
        current_request_method.set(None)


@pytest.mark.asyncio
async def test_write_http_methods_route_to_primary(multi_node_cluster):
    """POST, PUT, DELETE, PATCH requests must bind directly to Primary."""
    sm = multi_node_cluster["sessionmaker"]
    primary_sync = multi_node_cluster["primary"].sync_engine

    for method in ("POST", "PUT", "DELETE", "PATCH"):
        current_request_method.set(method)
        try:
            async with sm() as session:
                stmt = select(SampleEntity)
                bind = session.sync_session.get_bind(clause=stmt)
                assert bind == primary_sync, f"HTTP {method} must route to Primary engine"
        finally:
            current_request_method.set(None)


@pytest.mark.asyncio
async def test_read_your_own_writes_consistency(multi_node_cluster):
    """After adding or mutating entities, subsequent reads in the session must stick to Primary."""
    sm = multi_node_cluster["sessionmaker"]
    primary_sync = multi_node_cluster["primary"].sync_engine
    replica_1_sync = multi_node_cluster["replica_1"].sync_engine
    replica_2_sync = multi_node_cluster["replica_2"].sync_engine

    current_request_method.set("GET")
    try:
        async with sm() as session:
            # 1. Before write -> routes to replica
            read_stmt = select(SampleEntity)
            bind_before = session.sync_session.get_bind(clause=read_stmt)
            assert bind_before in (replica_1_sync, replica_2_sync)

            # 2. Mutate state: add new entity to session
            entity = SampleEntity(name="New Booking")
            session.add(entity)

            # 3. Read in the same session -> Must now route to Primary for monotonic consistency!
            bind_after = session.sync_session.get_bind(clause=read_stmt)
            assert bind_after == primary_sync, "Read-your-own-writes requires pinning to Primary"
    finally:
        current_request_method.set(None)


@pytest.mark.asyncio
async def test_context_manager_routing_overrides(multi_node_cluster):
    """use_primary_node and use_replica_node context managers force specific engines."""
    sm = multi_node_cluster["sessionmaker"]
    primary_sync = multi_node_cluster["primary"].sync_engine
    replica_1_sync = multi_node_cluster["replica_1"].sync_engine
    replica_2_sync = multi_node_cluster["replica_2"].sync_engine

    # Force Primary
    async with use_primary_node():
        async with sm() as session:
            stmt = select(SampleEntity)
            assert session.sync_session.get_bind(clause=stmt) == primary_sync

    # Force Replica even during POST
    current_request_method.set("POST")
    try:
        async with use_replica_node():
            async with sm() as session:
                stmt = select(SampleEntity)
                assert session.sync_session.get_bind(clause=stmt) in (replica_1_sync, replica_2_sync)
    finally:
        current_request_method.set(None)
