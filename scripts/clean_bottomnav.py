import os
import re
import glob

# Files where BottomNav should NOT be present (secondary/stack screens and duplicate tabs)
TARGET_FILES = [
    "src/screens/CarRentalsScreen.tsx",
    "src/screens/FlightsScreen.tsx",
    "src/screens/HotelsHomesScreen.tsx",
    "src/screens/PackageScreen.tsx",
    "src/screens/SearchScreen.tsx",
    "src/screens/AgencyChatScreen.tsx",
    "src/screens/AgencyListScreen.tsx",
    "src/screens/ConvertedScreen.tsx",
    "src/screens/CommunityScreen.tsx",
    "app/(tabs)/account.tsx",
    "app/screens/payment-details.tsx",
    "app/screens/payment-success.tsx",
    "app/screens/payment-failed.tsx",
    "app/screens/payments.tsx",
    "app/screens/reviews.tsx",
    "app/screens/saved.tsx",
    "app/screens/transaction-history.tsx",
]

for file_path in TARGET_FILES:
    normalized_path = os.path.normpath(file_path)
    if not os.path.exists(normalized_path):
        print(f"Skipping not found: {normalized_path}")
        continue

    with open(normalized_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Remove <BottomNav ... /> (single line or multi-line)
    content = re.sub(r"[ \t]*<BottomNav\b[^>]*\/>[ \t]*\r?\n?", "", content)

    # 2. In secondary stack screens and duplicate tab views, remove <AiPill ... /> as well if present
    content = re.sub(r"[ \t]*<AiPill\b[^>]*\/>[ \t]*\r?\n?", "", content)
    # Also remove comment lines like {/* Floating AI Assistant */} or {/* Bottom Nav */}
    content = re.sub(r"[ \t]*{\/\*\s*(Floating AI|Bottom Nav).*?\*\/}[ \t]*\r?\n?", "", content)

    # 3. Clean up unused imports of BottomNav and AiPill
    # e.g., import { AiPill, BottomNav } from "./Navigation"; -> delete or clean
    content = re.sub(
        r"import\s*\{\s*AiPill\s*,\s*BottomNav\s*\}\s*from\s*[\"'][^\"']+[\"'];?[ \t]*\r?\n?",
        "",
        content
    )
    content = re.sub(
        r"import\s*\{\s*BottomNav\s*,\s*AiPill\s*\}\s*from\s*[\"'][^\"']+[\"'];?[ \t]*\r?\n?",
        "",
        content
    )
    content = re.sub(
        r"import\s*\{\s*BottomNav\s*\}\s*from\s*[\"'][^\"']+[\"'];?[ \t]*\r?\n?",
        "",
        content
    )
    content = re.sub(
        r"import\s*\{\s*AiPill\s*\}\s*from\s*[\"'][^\"']+[\"'];?[ \t]*\r?\n?",
        "",
        content
    )

    if content != original:
        with open(normalized_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Cleaned: {normalized_path}")
    else:
        print(f"No changes needed: {normalized_path}")

print("Done cleaning BottomNav instances.")
