"""
VeriGold — Fabric Gateway Client (Phase 4 §4.1.1)

Provides an async interface to the Hyperledger Fabric consortium network
via the peer CLI / Gateway bridge. The client is a per-lender singleton
(keyed by MSP ID) to manage connections across requests.

Design decisions:
  - In live mode (FABRIC_GATEWAY_URL != "stub"), transactions are submitted
    and evaluated against the running Hyperledger Fabric consortium network.
  - Subprocess execution uses asyncio.to_thread to prevent blocking the async
    FastAPI event loop on Windows.
  - Connection errors and Fabric errors are caught and re-raised as
    FabricUnavailableError (HTTP 503) — callers never see raw CLI/gRPC exceptions.
  - evaluate_transaction (chaincode query) does NOT write to the ledger.
  - submit_transaction (chaincode invoke) writes to the ledger and returns tx hash.

Stub mode (FABRIC_GATEWAY_URL == "stub"):
  Returns predictable mock responses for lightweight unit tests without Docker.
"""
import asyncio
import json
import logging
import os
import subprocess
from typing import Any
from uuid import uuid4

from app.config.settings import get_settings
from app.utils.errors import FabricUnavailableError

logger = logging.getLogger(__name__)
settings = get_settings()

# Module-level cache: msp_id -> FabricGatewayClient
_clients: dict[str, "FabricGatewayClient"] = {}


# ---------------------------------------------------------------------------
# Stub helpers
# ---------------------------------------------------------------------------

def _stub_submit(fn_name: str, args: list[str]) -> str:
    """Return a fake Fabric tx hash for dev/test without a real peer."""
    fake_tx = f"STUB-{uuid4().hex[:16].upper()}"
    logger.debug("[STUB] submit %s(%s) -> %s", fn_name, args, fake_tx)
    return fake_tx


def _stub_evaluate(fn_name: str, args: list[str]) -> bytes:
    """Return minimal valid JSON payloads matching chaincode output schemas."""
    if fn_name == "GetBorrowerSummary":
        result = {
            "borrowerHash": args[0] if args else "stub_hash",
            "activePledgeCount": 1,
            "totalAmountRangeSum": 2,
            "velocity7d": 1,
            "lenderMSPIDs": ["Org1MSP"],
            "active_pledge_count": 1,
            "total_amount_range_sum": 2,
            "velocity_7d": 1,
        }
    elif fn_name == "GetGoldMatch":
        result = {
            "matchFound": False,
            "matchedPledgeId": "",
            "match_found": False,
            "matched_pledge_id": "",
        }
    elif fn_name == "GetPledge":
        result = {
            "pledgeId": args[0] if args else "stub_pledge",
            "borrowerHash": "stub_hash",
            "goldFingerprint": "stub_fp",
            "lenderMSPID": "Org1MSP",
            "amountRange": 2,
            "status": "ACTIVE",
            "timestamp": "2026-01-01T00:00:00Z",
            "pledge_id": args[0] if args else "stub_pledge",
            "borrower_hash": "stub_hash",
            "gold_fingerprint": "stub_fp",
            "lender_id": "Org1MSP",
            "amount_range": 2,
            "created_at": 1767225600,
        }
    else:
        result = {}
    return json.dumps(result).encode()


# ---------------------------------------------------------------------------
# FabricGatewayClient
# ---------------------------------------------------------------------------

class FabricGatewayClient:
    """
    Async Fabric Gateway client connecting to the live Hyperledger Fabric network.

    In stub mode (FABRIC_GATEWAY_URL == "stub"), calls return mock responses.
    In live mode, calls execute through the WSL/peer bridge with full mutual TLS
    and multi-org endorsement.
    """

    def __init__(self, msp_id: str) -> None:
        self.msp_id = msp_id
        self._stub_mode = settings.FABRIC_GATEWAY_URL == "stub"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def submit_transaction(
        self, fn_name: str, args: list[str], lender_msp_id: str | None = None
    ) -> str:
        """
        Submit a chaincode transaction (ledger write with consensus).

        Returns:
            Fabric transaction ID (hex string).
        Raises:
            FabricUnavailableError on any connectivity / Fabric error.
        """
        if self._stub_mode:
            return _stub_submit(fn_name, args)

        effective_msp = lender_msp_id or self.msp_id
        try:
            return await self._execute_submit(fn_name, args, effective_msp)
        except Exception as exc:
            logger.error("Fabric submit_transaction failed for %s: %s", fn_name, exc)
            raise FabricUnavailableError(
                f"Fabric ledger write failed: {exc}"
            )

    async def evaluate_transaction(
        self, fn_name: str, args: list[str]
    ) -> bytes:
        """
        Evaluate a chaincode query (read-only, no ledger write).

        Returns:
            Raw bytes returned by chaincode (caller parses JSON).
        Raises:
            FabricUnavailableError on any connectivity / Fabric error.
        """
        if self._stub_mode:
            return _stub_evaluate(fn_name, args)

        try:
            return await self._execute_evaluate(fn_name, args)
        except Exception as exc:
            logger.error("Fabric evaluate_transaction failed for %s: %s", fn_name, exc)
            raise FabricUnavailableError(
                f"Fabric ledger query failed: {exc}"
            )

    # ------------------------------------------------------------------
    # Bridge execution (Production / Live Network)
    # ------------------------------------------------------------------

    async def _execute_submit(self, fn_name: str, args: list[str], msp_id: str) -> str:
        """Execute chaincode invoke via WSL peer CLI bridge."""
        # Normalize arguments to match Go smart contract function signatures
        if fn_name == "RegisterPledge":
            # Go expects 4 args: [pledge_id, borrower_hash, gold_fingerprint, amount_range]
            # Callers might pass 5 args with msp_id appended
            filtered_args = [str(args[0]), str(args[1]), str(args[2]), str(args[3])]
        elif fn_name == "ClosePledge":
            # Go expects 1 arg: [pledge_id]
            filtered_args = [str(args[0])]
        else:
            filtered_args = [str(a) for a in args]

        cmd = [
            "wsl",
            "-d",
            "Ubuntu",
            "bash",
            settings.FABRIC_BRIDGE_SCRIPT,
            "invoke",
            msp_id,
            fn_name,
            *filtered_args,
        ]

        def _run():
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=30,
            )

        res = await asyncio.to_thread(_run)
        if res.returncode != 0:
            err_msg = res.stderr.strip() or res.stdout.strip()
            raise RuntimeError(f"Fabric invoke failed: {err_msg}")

        stdout = res.stdout.strip()
        # Find line with SUCCESS:<txid>
        for line in stdout.splitlines():
            line = line.strip()
            if line.startswith("SUCCESS:"):
                tx_id = line.split(":", 1)[1].strip()
                logger.info("Fabric tx confirmed: %s (fn=%s)", tx_id, fn_name)
                return tx_id

        # Fallback if SUCCESS wasn't prefixed
        return stdout

    async def _execute_evaluate(self, fn_name: str, args: list[str]) -> bytes:
        """Execute chaincode query via WSL peer CLI bridge."""
        if fn_name == "GetBorrowerSummary":
            filtered_args = [str(args[0])]
        elif fn_name == "GetGoldMatch":
            filtered_args = [str(args[0])]
        elif fn_name == "GetPledge":
            filtered_args = [str(args[0])]
        else:
            filtered_args = [str(a) for a in args]

        cmd = [
            "wsl",
            "-d",
            "Ubuntu",
            "bash",
            settings.FABRIC_BRIDGE_SCRIPT,
            "query",
            self.msp_id,
            fn_name,
            *filtered_args,
        ]

        def _run():
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

        res = await asyncio.to_thread(_run)
        if res.returncode != 0:
            err_msg = res.stderr.strip() or res.stdout.strip()
            raise RuntimeError(f"Fabric query failed: {err_msg}")

        raw_output = res.stdout.strip()
        # Parse JSON and add camelCase compatibility fields
        try:
            data = json.loads(raw_output)
            if isinstance(data, dict):
                # Add camelCase aliases so existing consumers work seamlessly
                if "active_pledge_count" in data:
                    data["activePledgeCount"] = data["active_pledge_count"]
                if "total_amount_range_sum" in data:
                    data["totalAmountRangeSum"] = data["total_amount_range_sum"]
                if "velocity_7d" in data:
                    data["velocity7d"] = data["velocity_7d"]
                if "match_found" in data:
                    data["matchFound"] = data["match_found"]
                if "matched_pledge_id" in data:
                    data["matchedPledgeId"] = data["matched_pledge_id"]
                if "pledge_id" in data:
                    data["pledgeId"] = data["pledge_id"]
                if "borrower_hash" in data:
                    data["borrowerHash"] = data["borrower_hash"]
                if "gold_fingerprint" in data:
                    data["goldFingerprint"] = data["gold_fingerprint"]
                if "lender_id" in data:
                    data["lenderMSPID"] = data["lender_id"]
                    data["lenderMSPIDs"] = [data["lender_id"]]
                if "amount_range" in data:
                    data["amountRange"] = data["amount_range"]
            return json.dumps(data).encode()
        except Exception:
            return raw_output.encode()


# ---------------------------------------------------------------------------
# Module-level factory
# ---------------------------------------------------------------------------

def get_fabric_client(msp_id: str | None = None) -> FabricGatewayClient:
    """
    Return (and cache) a FabricGatewayClient for the given MSP ID.

    Falls back to settings.FABRIC_ORG_MSP_ID if msp_id is not provided.
    """
    effective_msp = msp_id or settings.FABRIC_ORG_MSP_ID
    if effective_msp not in _clients:
        _clients[effective_msp] = FabricGatewayClient(effective_msp)
    return _clients[effective_msp]

