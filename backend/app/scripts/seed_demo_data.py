#!/usr/bin/env python3
"""
VeriGold — Demo Data Seed Script (Phase 8 §8.2.1)

Pre-registers demo pledges for all 4 synthetic borrower scenarios (A/B/C/D from PRD §26)
and a gold fingerprint that will trigger a match for Scenario D.

Usage:
    cd backend
    python -m app.scripts.seed_demo_data

Environment:
    BORROWER_HASH_KEY, DATABASE_URL, and FABRIC settings must be set
    (or loaded from .env). If FABRIC is unavailable, the script seeds
    the PostgreSQL mirror directly (offline mode) for demo purposes.

Output:
    Prints a complete reference card with all demo hashes and fingerprints
    to stdout. Copy this output into docs/demo.md or keep it handy at the demo.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow running from backend/ or root
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sentinel Aadhaar numbers for each scenario
# These are synthetic, non-real, test-only values.
# ---------------------------------------------------------------------------
DEMO_AADHAAR = {
    "A": "111111111111",   # Scenario A — Clean borrower (0 pledges)
    "B": "222222222222",   # Scenario B — Moderate (2 pledges)
    "C": "333333333333",   # Scenario C — High velocity (4 pledges, 4 in 7d)
    "D": "444444444444",   # Scenario D — Clean history, but gold match
}

# Gold item for Scenario D (pre-pledged under Org1 to trigger match)
DEMO_GOLD_D = {
    "weight_grams": 22.5,
    "purity_percent": 91.6,
    "item_type": "Bangle",
    "item_count": 1,
    "dimensions": {"diameter_mm": 65.0},
    "characteristics": {"hallmark": "BIS916", "maker": "TBZ"},
}


def _compute_hash(aadhaar: str, key: bytes) -> str:
    """Compute HMAC-SHA256 borrower hash with the given key."""
    normalised = aadhaar.replace(" ", "").replace("-", "")
    return hmac.new(key, normalised.encode("utf-8"), digestmod=hashlib.sha256).hexdigest()


def _compute_gold_fingerprint(item: dict) -> str:
    """
    Compute SHA-256 gold fingerprint matching the app's canonical algorithm.
    Weight quantised to nearest 500mg; purity mapped to karat band.
    """
    from app.utils.gold_fingerprint import build_canonical_json, compute_gold_fingerprint
    cj = build_canonical_json(
        weight_g=item["weight_grams"],
        purity_pct=item["purity_percent"],
        item_type=item["item_type"].lower(),
        item_count=item["item_count"],
        dimensions=item.get("dimensions"),
        characteristics=item.get("characteristics"),
    )
    return compute_gold_fingerprint(cj)


async def _seed_fabric_pledges(hashes: dict[str, str], gold_fp_d: str) -> dict:
    """
    Attempt to seed pledge data via Fabric (live path).
    Falls back to offline mirror seeding if Fabric is unavailable.
    Returns: {lender_msp_id: tx_hash, ...} for each registered pledge.
    """
    from app.services.fabric_gateway import get_fabric_client
    from app.utils.errors import FabricUnavailableError

    results = {}

    # Scenario B: Org1 already has 2 pledges for borrower B
    # Scenario C: four different orgs have one pledge each for borrower C
    # Scenario D: Org1 has one pledge with the gold item that matches Demo D
    seed_plans = [
        # (scenario_key, lender_msp_id, amount_range, gold_fp)
        ("B", "Org1MSP", 2, "b" * 64),
        ("B", "Org2MSP", 1, "c" * 64),
        ("C", "Org1MSP", 3, "d" * 64),
        ("C", "Org2MSP", 2, "e" * 64),
        ("C", "Org3MSP", 2, "f" * 64),
        ("C", "Org4MSP", 3, "g" * 64),
        ("D", "Org1MSP", 2, gold_fp_d),  # Scenario D gold item pre-pledged here
    ]

    for sc, msp_id, amount_range, fp in seed_plans:
        pledge_id = f"PLG-DEMO-{sc}-{msp_id[:4]}"
        try:
            fabric = get_fabric_client(msp_id)
            args = [pledge_id, hashes[sc], fp, str(amount_range)]
            tx_hash = await fabric.submit_transaction("RegisterPledge", args)
            tx_str = tx_hash.decode() if hasattr(tx_hash, "decode") else str(tx_hash)
            results[f"{sc}_{msp_id}"] = tx_str
            log.info("Fabric: registered pledge %s → %s", pledge_id, tx_str[:16])
        except FabricUnavailableError:
            log.warning("Fabric unavailable — skipping Fabric pledge for %s/%s", sc, msp_id)
            results[f"{sc}_{msp_id}"] = "FABRIC_UNAVAILABLE"
        except Exception as exc:
            log.warning("Fabric error for %s/%s: %s", sc, msp_id, exc)
            results[f"{sc}_{msp_id}"] = f"ERROR:{exc}"

    return results


async def _seed_db_mirrors(
    hashes: dict[str, str],
    gold_fp_d: str,
    fabric_results: dict,
) -> None:
    """
    Seed PledgeMirror rows in PostgreSQL for demo pledges.
    This is the primary offline fallback — the risk engine reads mirrors
    when Fabric is unavailable.
    """
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.models.fraud_alert import AlertStatus, AlertType, FraudAlert
    from app.models.pledge_mirror import PledgeMirror, PledgeStatus
    from app.models.transaction import Transaction, TransactionStatus, TransactionType
    from app.config.settings import get_settings

    settings = get_settings()
    db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(db_url, echo=False)
    from app.models.base import Base
    from app.models.lender import Lender, LenderStatus
    import app.models  # load all models for metadata

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # (pledge_id, scenario, lender_id, borrower_hash, amount_range, fingerprint, status)
    mirrors = [
        ("PLG-DEMO-B-ORG1", "B", 1, hashes["B"], 2, "b" * 64, PledgeStatus.active),
        ("PLG-DEMO-B-ORG2", "B", 2, hashes["B"], 1, "c" * 64, PledgeStatus.active),
        ("PLG-DEMO-C-ORG1", "C", 1, hashes["C"], 3, "d" * 64, PledgeStatus.active),
        ("PLG-DEMO-C-ORG2", "C", 2, hashes["C"], 2, "e" * 64, PledgeStatus.active),
        ("PLG-DEMO-C-ORG3", "C", 3, hashes["C"], 2, "f" * 64, PledgeStatus.active),
        ("PLG-DEMO-C-ORG4", "C", 4, hashes["C"], 3, "g" * 64, PledgeStatus.active),
        ("PLG-DEMO-D-ORG1", "D", 1, hashes["D"], 2, gold_fp_d, PledgeStatus.active),
    ]

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Pre-seed demo lenders if they do not exist
        for l_id, l_ref, msp, name in [
            (1, "Org1Admin", "Org1MSP", "Shri Lakshmi Finance Ltd"),
            (2, "Org2Admin", "Org2MSP", "Sunrise Gold Loans"),
            (3, "Org3Admin", "Org3MSP", "Muthoot Quick Gold"),
            (4, "Org4Admin", "Org4MSP", "Manappuram Finance Ltd"),
        ]:
            existing = await session.get(Lender, l_id)
            if not existing:
                session.add(
                    Lender(
                        id=l_id,
                        login_identity_ref=l_ref,
                        fabric_msp_id=msp,
                        organization_name=name,
                        status=LenderStatus.active,
                    )
                )
        await session.flush()

        for pledge_id, sc, lender_id, b_hash, amount_range, fp, status in mirrors:
            stmt = select(PledgeMirror).where(PledgeMirror.pledge_id == pledge_id)
            existing_m = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_m:
                mirror = PledgeMirror(
                    pledge_id=pledge_id,
                    lender_id=lender_id,
                    borrower_hash=b_hash,
                    gold_fingerprint=fp,
                    amount_range=amount_range,
                    status=status,
                    transaction_hash=fabric_results.get(f"{sc}_Org{lender_id}MSP", f"TX-DEMO-{pledge_id}"),
                )
                session.add(mirror)

                tx = Transaction(
                    lender_id=lender_id,
                    pledge_id=pledge_id,
                    transaction_hash=fabric_results.get(f"{sc}_Org{lender_id}MSP", f"TX-DEMO-{pledge_id}"),
                    transaction_type=TransactionType.REGISTER_PLEDGE,
                    status=TransactionStatus.confirmed,
                )
                session.add(tx)

        # Seed demo fraud alerts for C and D if none exist
        demo_alerts = [
            (
                hashes["C"],
                None,
                95,
                AlertType.VELOCITY,
                "High pledge velocity detected: 4 pledges in 7 days across 4 lenders (score 95).",
            ),
            (
                hashes["D"],
                gold_fp_d,
                85,
                AlertType.GOLD_MATCH,
                "Gold item fingerprint matches an active pledge at Shri Lakshmi Finance Ltd. Risk score: 85.",
            ),
        ]
        for b_hash, g_fp, score, a_type, msg in demo_alerts:
            stmt = select(FraudAlert).where(FraudAlert.borrower_hash == b_hash)
            existing_a = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_a:
                alert = FraudAlert(
                    borrower_hash=b_hash,
                    gold_fingerprint=g_fp,
                    risk_score=score,
                    alert_type=a_type,
                    message=msg,
                    status=AlertStatus.open,
                )
                session.add(alert)

        try:
            await session.commit()
            log.info("DB: seeded demo lenders, pledge mirrors, and fraud alerts")
            from sqlalchemy import text
            for tbl in ["lenders", "pledge_mirrors", "transactions"]:
                try:
                    await session.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1));"
                    ))
                except Exception as seq_exc:
                    log.warning("Could not sync sequence for %s: %s", tbl, seq_exc)
            await session.commit()
        except Exception as exc:
            await session.rollback()
            log.error("DB seed failed: %s", exc)

    await engine.dispose()


def _print_reference_card(
    hashes: dict[str, str],
    gold_fp_d: str,
    fabric_results: dict,
) -> None:
    """Print a complete demo reference card to stdout."""
    sep = "=" * 72

    print()
    print(sep)
    print("  VeriGold — Demo Reference Card")
    print(f"  Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(sep)

    print("\n📋  BORROWER HASHES (HMAC-SHA256, safe to share)")
    print("-" * 72)
    for sc, label in [
        ("A", "Scenario A — Clean borrower (0 pledges)      → LOW  / APPROVE"),
        ("B", "Scenario B — Moderate exposure (2 pledges)   → MEDIUM / REDUCE"),
        ("C", "Scenario C — High velocity (4 pledges in 7d) → HIGH / REJECT"),
        ("D", "Scenario D — Gold match (0 pledges, matched) → HIGH / REJECT"),
    ]:
        print(f"\n  {label}")
        print(f"  Aadhaar (synthetic): {DEMO_AADHAAR[sc]}")
        print(f"  Hash:  {hashes[sc]}")

    print(f"\n\n🥇  GOLD FINGERPRINT — Scenario D pre-pledged item")
    print("-" * 72)
    print(f"  Item:  {DEMO_GOLD_D['item_type']}, {DEMO_GOLD_D['weight_grams']}g, {DEMO_GOLD_D['purity_percent']}% purity")
    print(f"  Dims:  {DEMO_GOLD_D['dimensions']}")
    print(f"  Hash:  {gold_fp_d}")

    print(f"\n\n🔗  FABRIC RESULTS")
    print("-" * 72)
    for key, val in fabric_results.items():
        status = "✓" if not val.startswith(("FABRIC", "ERROR")) else "⚠"
        print(f"  {status} {key:30s}  {val[:48]}")

    print()
    print(sep)
    print("  Demo flow: login → Scenario C → Scenario D (gold appraisal)")
    print("           → Scenario A → register pledge → ZK proof → close pledge")
    print(sep)
    print()


async def main():
    log.info("VeriGold demo data seeder starting…")

    # Load BORROWER_HASH_KEY
    from app.config.settings import get_settings
    settings = get_settings()
    try:
        key = bytes.fromhex(settings.BORROWER_HASH_KEY)
    except ValueError:
        key = settings.BORROWER_HASH_KEY.encode("utf-8")

    # Compute hashes for all 4 scenarios
    hashes = {sc: _compute_hash(aadhaar, key) for sc, aadhaar in DEMO_AADHAAR.items()}
    log.info("Computed borrower hashes for scenarios A/B/C/D")

    # Compute Scenario D gold fingerprint
    gold_fp_d = _compute_gold_fingerprint(DEMO_GOLD_D)
    log.info("Computed Scenario D gold fingerprint: %s…", gold_fp_d[:16])

    # Seed Fabric pledges (best-effort; falls back gracefully)
    fabric_results = await _seed_fabric_pledges(hashes, gold_fp_d)

    # Seed DB mirrors
    try:
        await _seed_db_mirrors(hashes, gold_fp_d, fabric_results)
    except Exception as exc:
        log.warning("DB seeding skipped (may need running services): %s", exc)

    # Print reference card
    _print_reference_card(hashes, gold_fp_d, fabric_results)
    log.info("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
