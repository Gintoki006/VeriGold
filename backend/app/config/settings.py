"""
VeriGold — Application Settings

All environment variables are loaded here via pydantic-settings.
Risk scoring weights are kept in RiskConfig — never hardcoded inline.
"""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_fabric_bridge_script() -> str:
    p = Path(__file__).resolve().parents[3]
    if p.drive:
        drive = p.drive.replace(":", "").lower()
        return f"/mnt/{drive}" + p.as_posix()[2:] + "/fabric/network/cc-client.sh"
    return str(p / "fabric" / "network" / "cc-client.sh")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/verigold"

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # Borrower Privacy
    BORROWER_HASH_KEY: str = "change-me-in-production"

    # Fabric
    FABRIC_GATEWAY_URL: str = "localhost:7051"
    FABRIC_CA_URL: str = "http://localhost:7054"
    FABRIC_MSP_CONFIG_PATH: str = "/app/fabric/crypto-config"
    FABRIC_CHANNEL_NAME: str = "mychannel"
    CHAINCODE_NAME: str = "verigold"
    FABRIC_ORG_MSP_ID: str = "Org1MSP"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI / LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # ZK
    ZK_CIRCUIT_PATH: str = "/app/zk/circuits/exposure_threshold"
    ZK_PROOF_FALLBACK: bool = False

    # Fabric bridge (WSL peer CLI path — dynamically resolved relative to repository root)
    FABRIC_BRIDGE_SCRIPT: str = _resolve_fabric_bridge_script()

    # Noir/Nargo binary path (overridable for WSL/Linux environments)
    NARGO_PATH: str = "/home/sayan/.nargo/bin/nargo"

    # Rate Limiting
    BORROWER_SEARCH_RATE_LIMIT: int = 10

    # Frontend (for CORS)
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Demo mode — enables in-memory demo shortcuts (never enable in production)
    DEMO_MODE: bool = False


@dataclass
class RiskConfig:
    """
    Deterministic rule-engine weights and score thresholds.
    These are the locked values from docs/decisions.md Decision 3.
    Change here only — never scatter these numbers across business logic.
    """
    # Score contributions
    SCORE_0_ACTIVE: int = 10
    SCORE_1_ACTIVE: int = 25
    SCORE_2_ACTIVE: int = 50
    SCORE_3PLUS_ACTIVE: int = 80
    SCORE_VELOCITY_FLAG: int = 20
    SCORE_GOLD_MATCH: int = 40
    SCORE_HIGH_EXPOSURE: int = 15

    # Risk level thresholds
    THRESHOLD_LOW: int = 30
    THRESHOLD_HIGH: int = 70

    # Velocity threshold (pledges in 7 days)
    VELOCITY_THRESHOLD: int = 2

    # High exposure threshold (amount_range_sum)
    HIGH_EXPOSURE_SUM: int = 3


RISK_CONFIG = RiskConfig()


@lru_cache
def get_settings() -> Settings:
    return Settings()
