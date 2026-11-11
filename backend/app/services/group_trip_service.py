"""
Group Trip Balances & Debt Minimisation Service - Shopno Jatra FastAPI Backend

Implements pure integer paisa math (1 BDT = 100 Paisa) with ZERO floating-point operations.
Applies largest-remainder rule (Hare-Niemeyer method) for uneven splits and greedy transfer minimisation.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class Transfer:
    from_user: str
    to_user: str
    amount_paisa: int


def bdt_to_paisa(bdt: str | int | float) -> int:
    """Converts BDT representation to integer paisa without floating point issues."""
    if isinstance(bdt, float):
        bdt = f"{bdt:.2f}"
    clean = str(bdt).strip().replace(",", "")
    if not clean or clean == "0":
        return 0
    is_negative = clean.startswith("-")
    if is_negative:
        clean = clean[1:]
    parts = clean.split(".")
    integer_part = int(parts[0]) if parts[0] else 0
    decimal_part = (parts[1] if len(parts) > 1 else "").ljust(2, "0")[:2]
    paisa = integer_part * 100 + int(decimal_part)
    return -paisa if is_negative else paisa


def paisa_to_bdt(paisa: int) -> str:
    """Converts integer paisa to standard formatted BDT string."""
    is_negative = paisa < 0
    abs_p = abs(paisa)
    integer_part = abs_p // 100
    remainder = abs_p % 100
    return f"{'-' if is_negative else ''}{integer_part}.{remainder:02d}"


def split_expense_with_largest_remainder(
    amount_paisa: int,
    split_info: Dict[str, Any] | List[Any],
    all_members: List[str],
) -> Dict[str, int]:
    """
    Distributes amount_paisa among participants using largest-remainder rule.
    Guarantees sum(shares.values()) == amount_paisa with integer arithmetic only.
    """
    if amount_paisa <= 0:
        return {}

    # 1. Equal Split
    if isinstance(split_info, dict) and split_info.get("type") == "equal":
        participants = sorted(list(set(split_info.get("participants", []) or all_members)))
        n = len(participants)
        if n == 0:
            return {}
        floor_share = amount_paisa // n
        remainder = amount_paisa % n
        result = {}
        for idx, user_id in enumerate(participants):
            extra = 1 if idx < remainder else 0
            result[user_id] = floor_share + extra
        return result

    # 2. Weighted / Shares Split
    weights: Dict[str, int] = {}
    if isinstance(split_info, dict) and "shares" in split_info:
        raw_shares = split_info["shares"]
        for uid, w in raw_shares.items():
            if uid != "type" and int(w) > 0:
                weights[uid] = int(w)
    elif isinstance(split_info, dict):
        for uid, w in split_info.items():
            if uid != "type" and isinstance(w, (int, str)) and int(w) > 0:
                weights[uid] = int(w)
    elif isinstance(split_info, list):
        for item in split_info:
            uid = item.get("user_id")
            w = item.get("weight", 1)
            if uid and int(w) > 0:
                weights[uid] = int(w)

    if not weights:
        # Fall back to equal split
        return split_expense_with_largest_remainder(
            amount_paisa,
            {"type": "equal", "participants": all_members},
            all_members,
        )

    total_weight = sum(weights.values())
    candidates = []
    total_floor = 0

    for user_id, weight in sorted(weights.items()):
        unscaled = amount_paisa * weight
        floor_share = unscaled // total_weight
        remainder = unscaled % total_weight
        total_floor += floor_share
        candidates.append({"user_id": user_id, "floor": floor_share, "remainder": remainder})

    deficit = amount_paisa - total_floor

    # Sort descending by remainder, tie-breaking by user_id
    candidates.sort(key=lambda c: (-c["remainder"], c["user_id"]))

    result = {}
    for idx, c in enumerate(candidates):
        extra = 1 if idx < deficit else 0
        result[c["user_id"]] = c["floor"] + extra

    return result


def compute_balances(
    expenses: List[Dict[str, Any]],
    members: List[str],
) -> Dict[str, int]:
    """
    Computes net balances for each member.
    Payer gets +amount_paisa.
    Split participants get -share_paisa.
    Sum of all balances is strictly 0.
    """
    balances: Dict[str, int] = {m: 0 for m in members}

    for exp in expenses:
        payer = exp["paid_by"]
        amount = int(exp["amount_paisa"])
        if amount <= 0:
            continue

        balances[payer] = balances.get(payer, 0) + amount
        shares = split_expense_with_largest_remainder(
            amount, exp.get("split", {}), members
        )

        for user_id, share in shares.items():
            balances[user_id] = balances.get(user_id, 0) - share

    return balances


def minimise_transfers(balances: Dict[str, int]) -> List[Transfer]:
    """
    Greedy transfer minimisation using integer paisa.
    Matches largest debtor with largest creditor.
    Guarantees sum(transfers) == sum(debts) == sum(credits).
    """
    debtors = []
    creditors = []

    for user_id, bal in balances.items():
        if bal < 0:
            debtors.append({"user_id": user_id, "amount": -bal})
        elif bal > 0:
            creditors.append({"user_id": user_id, "amount": bal})

    debtors.sort(key=lambda x: (-x["amount"], x["user_id"]))
    creditors.sort(key=lambda x: (-x["amount"], x["user_id"]))

    transfers = []
    d_idx = 0
    c_idx = 0

    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]

        settle = min(debtor["amount"], creditor["amount"])
        if settle > 0:
            transfers.append(
                Transfer(
                    from_user=debtor["user_id"],
                    to_user=creditor["user_id"],
                    amount_paisa=settle,
                )
            )
            debtor["amount"] -= settle
            creditor["amount"] -= settle

        if debtor["amount"] == 0:
            d_idx += 1
        if creditor["amount"] == 0:
            c_idx += 1

    return transfers
