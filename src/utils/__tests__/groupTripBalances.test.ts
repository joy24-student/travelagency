import {
  bdtToPaisa,
  paisaToBdt,
  splitExpenseWithLargestRemainder,
  compute_balances,
  minimise_transfers,
  GroupExpense,
} from "../groupTripBalances";

describe("Group Trip Balances & Debt Minimisation Engine", () => {
  describe("Paisa & BDT Conversions (Zero Floating-Point)", () => {
    it("converts integer BDT string to paisa without floats", () => {
      expect(bdtToPaisa("100")).toBe(10000n);
      expect(bdtToPaisa(100)).toBe(10000n);
      expect(bdtToPaisa("0")).toBe(0n);
    });

    it("converts decimal BDT string accurately to paisa", () => {
      expect(bdtToPaisa("150.25")).toBe(15025n);
      expect(bdtToPaisa("150.5")).toBe(15050n);
      expect(bdtToPaisa("150.05")).toBe(15005n);
      expect(bdtToPaisa("1,500.50")).toBe(150050n);
    });

    it("converts paisa back to formatted BDT string", () => {
      expect(paisaToBdt(10000n)).toBe("100.00");
      expect(paisaToBdt(15025n)).toBe("150.25");
      expect(paisaToBdt(15005n)).toBe("150.05");
      expect(paisaToBdt(0n)).toBe("0.00");
    });
  });

  describe("Largest-Remainder Rule for Uneven Splits", () => {
    it("splits evenly when divisible with zero remainder", () => {
      const shares = splitExpenseWithLargestRemainder(
        300n,
        { type: "equal", participants: ["userA", "userB", "userC"] },
        ["userA", "userB", "userC"]
      );

      expect(shares.get("userA")).toBe(100n);
      expect(shares.get("userB")).toBe(100n);
      expect(shares.get("userC")).toBe(100n);

      const total = Array.from(shares.values()).reduce((a, b) => a + b, 0n);
      expect(total).toBe(300n);
    });

    it("splits 100 paisa across 3 members using largest remainder (34, 33, 33)", () => {
      const shares = splitExpenseWithLargestRemainder(
        100n,
        { type: "equal", participants: ["userA", "userB", "userC"] },
        ["userA", "userB", "userC"]
      );

      // 100 / 3 = 33 floor, remainder 1
      // userA gets the +1 paisa remainder (sorted alphabetically)
      expect(shares.get("userA")).toBe(34n);
      expect(shares.get("userB")).toBe(33n);
      expect(shares.get("userC")).toBe(33n);

      const total = Array.from(shares.values()).reduce((a, b) => a + b, 0n);
      expect(total).toBe(100n);
    });

    it("splits 100 paisa with unequal weights (1:2:4)", () => {
      const weights = { userA: 1, userB: 2, userC: 4 };
      const shares = splitExpenseWithLargestRemainder(
        100n,
        { type: "shares", shares: weights },
        ["userA", "userB", "userC"]
      );

      // Weights: total = 7
      // userA: 100 * 1 / 7 = 14.285 (floor 14, remainder 2)
      // userB: 100 * 2 / 7 = 28.571 (floor 28, remainder 4) -> gets +1
      // userC: 100 * 4 / 7 = 57.142 (floor 57, remainder 2)
      // Total floor = 99, deficit = 1 paisa. User B has remainder 4 > 2, so B gets +1.
      expect(shares.get("userA")).toBe(14n);
      expect(shares.get("userB")).toBe(29n);
      expect(shares.get("userC")).toBe(57n);

      const total = Array.from(shares.values()).reduce((a, b) => a + b, 0n);
      expect(total).toBe(100n);
    });
  });

  describe("compute_balances()", () => {
    it("computes net zero balances for simple split between two users", () => {
      const members = ["alice", "bob"];
      const expenses: GroupExpense[] = [
        {
          paid_by: "alice",
          amount_paisa: 1000n, // 10 BDT
          split: { type: "equal", participants: ["alice", "bob"] },
        },
      ];

      const balances = compute_balances(expenses, members);
      // Alice paid 1000, owes 500 -> net +500
      // Bob paid 0, owes 500 -> net -500
      expect(balances["alice"]).toBe(500n);
      expect(balances["bob"]).toBe(-500n);

      const sum = Object.values(balances).reduce((a, b) => a + b, 0n);
      expect(sum).toBe(0n);
    });

    it("computes balances across multiple multi-member expenses with odd amounts", () => {
      const members = ["alice", "bob", "charlie"];
      const expenses: GroupExpense[] = [
        {
          paid_by: "alice",
          amount_paisa: 301n, // 301 / 3 = 101, 100, 100
          split: { type: "equal", participants: ["alice", "bob", "charlie"] },
        },
        {
          paid_by: "bob",
          amount_paisa: 600n, // 200 each
          split: { type: "equal", participants: ["alice", "bob", "charlie"] },
        },
      ];

      const balances = compute_balances(expenses, members);
      const sum = Object.values(balances).reduce((a, b) => a + b, 0n);
      expect(sum).toBe(0n);
    });
  });

  describe("minimise_transfers()", () => {
    it("produces single direct transfer for 2 users", () => {
      const balances = {
        alice: 500n,
        bob: -500n,
      };

      const transfers = minimise_transfers(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        from: "bob",
        to: "alice",
        amount_paisa: 500n,
      });
    });

    it("simplifies circular debts efficiently with minimal transactions", () => {
      // 3 users: Alice owed 60, Bob owes 40, Charlie owes 20
      const balances = {
        alice: 6000n,
        bob: -4000n,
        charlie: -2000n,
      };

      const transfers = minimise_transfers(balances);
      expect(transfers).toHaveLength(2);

      // Total transfers equal total debt
      const totalTransferred = transfers.reduce((a, t) => a + t.amount_paisa, 0n);
      expect(totalTransferred).toBe(6000n);

      const bobTransfer = transfers.find((t) => t.from === "bob");
      expect(bobTransfer?.amount_paisa).toBe(4000n);
      expect(bobTransfer?.to).toBe("alice");

      const charlieTransfer = transfers.find((t) => t.from === "charlie");
      expect(charlieTransfer?.amount_paisa).toBe(2000n);
      expect(charlieTransfer?.to).toBe("alice");
    });
  });

  describe("PROPERTY TESTS: Transfer Minimisation Invariants", () => {
    it("Property: sum of transfers equals sum of debts across 100 randomized scenarios", () => {
      // Deterministic pseudo-random seed generator
      let seed = 42;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let run = 0; run < 100; run++) {
        const memberCount = Math.floor(random() * 6) + 3; // 3 to 8 members
        const members = Array.from({ length: memberCount }, (_, i) => `user_${i}`);

        const expenseCount = Math.floor(random() * 10) + 1; // 1 to 10 expenses
        const expenses: GroupExpense[] = [];

        for (let e = 0; e < expenseCount; e++) {
          const payer = members[Math.floor(random() * memberCount)];
          // Amount between 100 and 1,000,000 paisa (1 BDT to 10,000 BDT)
          const amountPaisa = BigInt(Math.floor(random() * 999900) + 100);

          // Random subset of participants
          const participants = members.filter(() => random() > 0.3);
          const finalParticipants = participants.length > 0 ? participants : members;

          // Either equal or weighted
          const isWeighted = random() > 0.5;
          let splitObj: any;
          if (isWeighted) {
            const weights: Record<string, number> = {};
            finalParticipants.forEach((p) => {
              weights[p] = Math.floor(random() * 5) + 1;
            });
            splitObj = { type: "shares", shares: weights };
          } else {
            splitObj = { type: "equal", participants: finalParticipants };
          }

          expenses.push({
            paid_by: payer,
            amount_paisa: amountPaisa,
            split: splitObj,
          });
        }

        // 1. Compute balances
        const balances = compute_balances(expenses, members);

        // Invariant 1: Sum of all net balances MUST equal 0 exactly
        const totalNet = Object.values(balances).reduce((acc, b) => acc + b, 0n);
        expect(totalNet).toBe(0n);

        // Sum of all debts and sum of all credits
        const totalDebts = Object.values(balances)
          .filter((b) => b < 0n)
          .reduce((acc, b) => acc + -b, 0n);
        const totalCredits = Object.values(balances)
          .filter((b) => b > 0n)
          .reduce((acc, b) => acc + b, 0n);
        expect(totalDebts).toBe(totalCredits);

        // 2. Minimise transfers
        const transfers = minimise_transfers(balances);

        // Invariant 2: Total transfers sum MUST equal total debts (and total credits)
        const totalTransferred = transfers.reduce((acc, t) => acc + t.amount_paisa, 0n);
        expect(totalTransferred).toBe(totalDebts);

        // Invariant 3: Number of transfers MUST be <= members - 1
        expect(transfers.length).toBeLessThanOrEqual(memberCount - 1);

        // Invariant 4: Every transfer amount MUST be strictly positive
        for (const t of transfers) {
          expect(t.amount_paisa).toBeGreaterThan(0n);
          expect(t.from).not.toBe(t.to);
        }

        // Invariant 5: For every debtor, total paid in transfers equals their debt
        for (const [userId, bal] of Object.entries(balances)) {
          if (bal < 0n) {
            const expectedDebt = -bal;
            const actualSent = transfers
              .filter((t) => t.from === userId)
              .reduce((acc, t) => acc + t.amount_paisa, 0n);
            expect(actualSent).toBe(expectedDebt);
          } else if (bal > 0n) {
            const expectedCredit = bal;
            const actualReceived = transfers
              .filter((t) => t.to === userId)
              .reduce((acc, t) => acc + t.amount_paisa, 0n);
            expect(actualReceived).toBe(expectedCredit);
          } else {
            // Settled user sends and receives 0
            const sent = transfers.filter((t) => t.from === userId);
            const received = transfers.filter((t) => t.to === userId);
            expect(sent).toHaveLength(0);
            expect(received).toHaveLength(0);
          }
        }
      }
    });
  });
});
