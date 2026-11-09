import random
import pytest
from app.services.group_trip_service import (
    bdt_to_paisa,
    paisa_to_bdt,
    split_expense_with_largest_remainder,
    compute_balances,
    minimise_transfers,
)


def test_bdt_paisa_conversions():
    assert bdt_to_paisa("100") == 10000
    assert bdt_to_paisa("150.25") == 15025
    assert bdt_to_paisa("150.5") == 15050
    assert paisa_to_bdt(10000) == "100.00"
    assert paisa_to_bdt(15025) == "150.25"


def test_largest_remainder_rule_equal():
    shares = split_expense_with_largest_remainder(
        100,
        {"type": "equal", "participants": ["u1", "u2", "u3"]},
        ["u1", "u2", "u3"],
    )
    assert sum(shares.values()) == 100
    assert sorted(list(shares.values())) == [33, 33, 34]


def test_largest_remainder_rule_weighted():
    shares = split_expense_with_largest_remainder(
        100,
        {"shares": {"u1": 1, "u2": 2, "u3": 4}},
        ["u1", "u2", "u3"],
    )
    assert sum(shares.values()) == 100
    assert shares["u1"] == 14
    assert shares["u2"] == 29
    assert shares["u3"] == 57


def test_compute_balances_and_minimise_transfers():
    members = ["alice", "bob", "charlie"]
    expenses = [
        {
            "paid_by": "alice",
            "amount_paisa": 300,
            "split": {"type": "equal", "participants": ["alice", "bob", "charlie"]},
        },
        {
            "paid_by": "bob",
            "amount_paisa": 600,
            "split": {"type": "equal", "participants": ["alice", "bob", "charlie"]},
        },
    ]
    balances = compute_balances(expenses, members)
    assert sum(balances.values()) == 0

    transfers = minimise_transfers(balances)
    total_transferred = sum(t.amount_paisa for t in transfers)
    total_debts = sum(-b for b in balances.values() if b < 0)
    assert total_transferred == total_debts


def test_property_sum_of_transfers_equals_sum_of_debts():
    """Property test over 100 random scenarios: sum of transfers == sum of debts."""
    rng = random.Random(42)

    for _ in range(100):
        num_members = rng.randint(3, 8)
        members = [f"user_{i}" for i in range(num_members)]
        num_expenses = rng.randint(1, 10)
        expenses = []

        for _ in range(num_expenses):
            payer = rng.choice(members)
            amount = rng.randint(100, 500000)
            participants = [m for m in members if rng.random() > 0.3] or members
            is_weighted = rng.random() > 0.5

            if is_weighted:
                weights = {p: rng.randint(1, 5) for p in participants}
                split_info = {"type": "shares", "shares": weights}
            else:
                split_info = {"type": "equal", "participants": participants}

            expenses.append({
                "paid_by": payer,
                "amount_paisa": amount,
                "split": split_info,
            })

        balances = compute_balances(expenses, members)
        assert sum(balances.values()) == 0

        debts_sum = sum(-b for b in balances.values() if b < 0)
        credits_sum = sum(b for b in balances.values() if b > 0)
        assert debts_sum == credits_sum

        transfers = minimise_transfers(balances)
        transferred_sum = sum(t.amount_paisa for t in transfers)
        assert transferred_sum == debts_sum
        assert len(transfers) <= num_members - 1

        for t in transfers:
            assert t.amount_paisa > 0
            assert t.from_user != t.to_user
