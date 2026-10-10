"""VeriGold — Admin Router (Phase 0 stub — all routes return HTTP 501)"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/lenders")
async def list_lenders():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})

@router.get("/stats")
async def platform_stats():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
