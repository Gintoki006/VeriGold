"""
VeriGold — Pydantic request/response schemas for auth endpoints.

Strict validation:
  - identity_ref / public_key: opaque string, max 128 chars, non-empty
  - signature: hex or base64 string for Ed25519
  - public_key: hex or base64 string for Ed25519
"""
import base64
from pydantic import BaseModel, Field, field_validator, model_validator


class ChallengeRequest(BaseModel):
    identity_ref: str | None = Field(
        default=None,
        max_length=128,
        description="Opaque lender identity reference (e.g. Supabase user UUID or public key)",
        examples=["org1-lender-uuid-abc123"],
    )
    public_key: str | None = Field(
        default=None,
        max_length=128,
        description="Ed25519 public key (hex or base64) used as identity",
    )

    @model_validator(mode="after")
    def check_identity(self):
        if not self.identity_ref and self.public_key:
            self.identity_ref = self.public_key
        if not self.identity_ref:
            raise ValueError("identity_ref or public_key must be provided")
        return self


class VerifyRequest(BaseModel):
    identity_ref: str | None = Field(default=None, max_length=128)
    challenge_id: str | None = Field(default=None, max_length=128)
    signature: str = Field(
        ...,
        description="Ed25519 signature over the challenge message, hex or base64",
    )
    public_key: str | None = Field(
        default=None,
        max_length=128,
        description="Ed25519 public key, hex or base64",
    )
    msp_id: str | None = Field(
        default=None,
        max_length=64,
        description="Optional target Fabric MSP ID (e.g. Org1MSP, Org2MSP) for institutional login",
    )

    @model_validator(mode="after")
    def check_identity(self):
        if not self.identity_ref:
            self.identity_ref = self.challenge_id or self.public_key
        if not self.public_key and self.identity_ref:
            self.public_key = self.identity_ref
        if not self.identity_ref:
            raise ValueError("identity_ref or challenge_id must be provided")
        return self

    @field_validator("signature", "public_key")
    @classmethod
    def must_be_valid_hex_or_b64(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            bytes.fromhex(v)
            return v.lower()
        except ValueError:
            pass
        try:
            base64.b64decode(v)
            return v
        except Exception:
            raise ValueError("must be a valid hex or base64 string")

