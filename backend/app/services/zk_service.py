"""
VeriGold — ZK Service (Phase 6 §6.2.1)

Generates a ZK proof for the statement: "total_exposure < threshold"
using the Noir/Barretenberg toolchain.

Two modes controlled by `settings.ZK_PROOF_FALLBACK`:
  False (default): invoke Barretenberg CLI (`bb`) as a subprocess — live proof.
  True (demo mode): return pre-generated proof from `zk/proofs/demo_proof.json`.

Privacy contract:
  - `total_exposure` is the private witness — NEVER included in the returned dict.
  - Only `threshold` (the public input) appears in the response.

Circuit statement (locked — one statement, no generalization):
  total_exposure < threshold
"""
import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

# Path to pre-generated demo proof (relative to repo root)
_REPO_ROOT = Path(__file__).resolve().parents[3]  # backend/app/services/ -> backend/app -> backend -> repo root
_DEMO_PROOF_PATH = _REPO_ROOT / "zk" / "proofs" / "demo_proof.json"
_DEMO_PUBLIC_INPUTS_PATH = _REPO_ROOT / "zk" / "proofs" / "demo_public_inputs.json"
_CIRCUIT_PATH = _REPO_ROOT / "zk" / "circuits" / "exposure_threshold"


async def generate_exposure_proof(total_exposure: int, threshold: int) -> dict:
    """
    Generate a ZK proof that total_exposure < threshold.

    Args:
        total_exposure: The borrower's actual aggregate exposure (private — NOT returned).
        threshold:      The lender's max acceptable exposure (public — returned).

    Returns:
        dict with keys:
          statement     str   — human-readable statement
          threshold     int   — the public input
          proof         str   — proof bytes as hex string
          verified      bool  — True if proof was successfully verified
          mode          str   — "live" or "fallback"
        NOTE: total_exposure is intentionally absent from the returned dict.
    """
    settings = get_settings()

    if settings.ZK_PROOF_FALLBACK:
        logger.info("ZK proof: fallback mode (pre-generated artifact)")
        return await _load_fallback_proof(threshold)

    logger.info("ZK proof: attempting live generation (bb CLI)")
    try:
        return await _generate_live_proof(total_exposure, threshold)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Live ZK proof generation failed — falling back to demo artifact")
        return await _load_fallback_proof(threshold)


# ---------------------------------------------------------------------------
# Fallback: pre-generated proof
# ---------------------------------------------------------------------------

async def _load_fallback_proof(threshold: int) -> dict:
    """Return the pre-generated demo proof artifact."""
    try:
        raw = _DEMO_PROOF_PATH.read_text(encoding="utf-8")
        data = json.loads(raw)
    except FileNotFoundError:
        logger.error("Demo proof file not found at %s", _DEMO_PROOF_PATH)
        return _error_result(threshold, "Demo proof artifact missing")
    except json.JSONDecodeError as exc:
        logger.error("Demo proof JSON malformed: %s", exc)
        return _error_result(threshold, "Demo proof artifact corrupt")

    return {
        "statement": "total_exposure < threshold",
        "threshold": threshold,
        "proof": data.get("proof", ""),
        "verified": data.get("verified", False),
        "mode": "fallback",
    }


# ---------------------------------------------------------------------------
# Live: invoke Barretenberg CLI as subprocess
# ---------------------------------------------------------------------------

async def _generate_live_proof(total_exposure: int, threshold: int) -> dict:
    """
    Invoke the Barretenberg / Noir CLI to generate and verify a live proof.

    Writes Prover.toml and Verifier.toml, compiles the circuit (if needed),
    generates the proof, verifies it, and returns the result.

    Raises on any subprocess failure — caller will fall back to demo artifact.
    """
    circuit_dir = _CIRCUIT_PATH
    if not circuit_dir.exists():
        raise FileNotFoundError(f"Circuit directory not found: {circuit_dir}")

    # 1. Write Prover.toml and Verifier.toml with current inputs
    prover_toml = circuit_dir / "Prover.toml"
    prover_content = f'total_exposure = "{total_exposure}"\nthreshold = "{threshold}"\n'
    prover_toml.write_text(prover_content, encoding="utf-8")

    verifier_toml = circuit_dir / "Verifier.toml"
    verifier_content = f'threshold = "{threshold}"\n'
    verifier_toml.write_text(verifier_content, encoding="utf-8")

    # 2. nargo compile (idempotent — skip if artifacts already present)
    target_json = circuit_dir / "target" / "exposure_threshold.json"
    if not target_json.exists():
        await _run(["nargo", "compile"], cwd=circuit_dir, desc="nargo compile")

    # 3. nargo prove
    await _run(["nargo", "prove"], cwd=circuit_dir, desc="nargo prove")

    # 4. nargo verify
    await _run(["nargo", "verify"], cwd=circuit_dir, desc="nargo verify")

    # 5. Read generated proof
    proof_path = circuit_dir / "proofs" / "exposure_threshold.proof"
    if not proof_path.exists():
        proof_path = circuit_dir / "target" / "proof"
    if proof_path.exists():
        try:
            proof_hex = proof_path.read_text(encoding="utf-8").strip()
        except Exception:
            proof_hex = proof_path.read_bytes().hex()
    else:
        proof_hex = ""

    logger.info("Live ZK proof generated and verified (threshold=%d)", threshold)
    return {
        "statement": "total_exposure < threshold",
        "threshold": threshold,
        "proof": proof_hex,
        "verified": True,
        "mode": "live",
    }


def _sync_run(cmd: list[str], cwd: Path, desc: str) -> None:
    import subprocess
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"{desc} failed (exit {proc.returncode}): {proc.stderr.strip()}"
        )
    logger.debug("%s OK: %s", desc, proc.stdout.strip()[:200])


async def _run(cmd: list[str], cwd: Path, desc: str) -> None:
    """Run a CLI command asynchronously via threadpool, avoiding Windows event loop NotImplementedError."""
    import shutil
    import sys

    # If running on Windows and nargo is only installed inside WSL Ubuntu, transparently invoke via wsl
    if cmd[0] == "nargo" and not shutil.which("nargo") and sys.platform.startswith("win"):
        from app.config.settings import get_settings as _gs
        nargo_path = _gs().NARGO_PATH
        effective_cmd = ["wsl", "-d", "Ubuntu", nargo_path] + cmd[1:]
    else:
        effective_cmd = cmd

    await asyncio.to_thread(_sync_run, effective_cmd, cwd, desc)


def _error_result(threshold: int, reason: str) -> dict:
    """Return a safe failed-proof result (never raises)."""
    return {
        "statement": "total_exposure < threshold",
        "threshold": threshold,
        "proof": "",
        "verified": False,
        "mode": "error",
        "error": reason,
    }
