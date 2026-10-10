"""
VeriGold — Demo Lender Seed Script

Seeds two demo lender records into the `lenders` table for local development
and demo rehearsal. Safe to run multiple times — uses upsert semantics.

Usage:
    cd backend
    python -m app.db.seed_lenders

Prerequisites:
  - DATABASE_URL must be set in .env (or environment)
  - Alembic migrations must have been applied: alembic upgrade head
"""
import asyncio
import sys

from sqlalchemy import select

from app.config.settings import get_settings
from app.db.database import AsyncSessionFactory
from app.models.lender import Lender, LenderStatus

settings = get_settings()

DEMO_LENDERS = [
    {
        "login_identity_ref": "org1-demo-lender-ref",
        "fabric_msp_id": "Org1MSP",
        "organization_name": "VeriGold Demo Bank (Org1)",
        "status": LenderStatus.active,
    },
    {
        "login_identity_ref": "org2-demo-lender-ref",
        "fabric_msp_id": "Org2MSP",
        "organization_name": "VeriGold Demo NBFC (Org2)",
        "status": LenderStatus.active,
    },
]


async def seed() -> None:
    async with AsyncSessionFactory() as db:
        for data in DEMO_LENDERS:
            stmt = select(Lender).where(
                Lender.login_identity_ref == data["login_identity_ref"]
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                print(f"[seed] Already exists: {data['organization_name']} — skipping.")
                continue

            lender = Lender(**data)
            db.add(lender)
            await db.flush()
            print(f"[seed] Created: {data['organization_name']} (MSP: {data['fabric_msp_id']})")

        await db.commit()
        print("[seed] Done.")


if __name__ == "__main__":
    asyncio.run(seed())
