"""Frameworks API — CRUD for control frameworks, controls, requirements, import/export."""
import json
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.framework import Framework, Control, Requirement

router = APIRouter(prefix="/frameworks", tags=["Frameworks"])

BUILTIN_DIR = os.path.join(os.path.dirname(__file__), "../../frameworks/builtin")


# ── Schemas ──────────────────────────────────────────────────────────────────

class FrameworkIn(BaseModel):
    name: str
    short_code: str
    version: str
    description: Optional[str] = None
    source_url: Optional[str] = None


class ControlIn(BaseModel):
    ref_code: str
    title: str
    description: Optional[str] = None
    control_type: str = "preventive"
    frequency: str = "annually"
    weight: float = 1.0
    parent_id: Optional[str] = None


class RequirementIn(BaseModel):
    ref_code: str
    title: str
    description: Optional[str] = None
    test_method: str = "test"
    evidence_guidance: Optional[str] = None


# ── Framework CRUD ────────────────────────────────────────────────────────────

@router.get("/")
async def list_frameworks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Framework).order_by(Framework.name))
    return [
        {"id": f.id, "name": f.name, "short_code": f.short_code,
         "version": f.version, "source": f.source, "is_active": f.is_active}
        for f in result.scalars()
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_framework(body: FrameworkIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Framework).where(Framework.short_code == body.short_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Framework '{body.short_code}' already exists")
    fw = Framework(**body.model_dump(), source="custom")
    db.add(fw)
    await db.commit()
    await db.refresh(fw)
    return {"id": fw.id, "name": fw.name, "short_code": fw.short_code}


@router.get("/{fw_id}")
async def get_framework(fw_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Framework).where(Framework.id == fw_id))
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")
    controls_result = await db.execute(select(Control).where(Control.framework_id == fw_id).order_by(Control.sort_order))
    controls = controls_result.scalars().all()
    return {
        "id": fw.id, "name": fw.name, "short_code": fw.short_code,
        "version": fw.version, "description": fw.description,
        "source": fw.source, "is_active": fw.is_active,
        "controls": [{"id": c.id, "ref_code": c.ref_code, "title": c.title, "parent_id": c.parent_id} for c in controls],
    }


@router.put("/{fw_id}")
async def update_framework(fw_id: str, body: FrameworkIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Framework).where(Framework.id == fw_id))
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")
    for k, v in body.model_dump().items():
        setattr(fw, k, v)
    await db.commit()
    return {"id": fw.id, "message": "Updated"}


@router.delete("/{fw_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_framework(fw_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Framework).where(Framework.id == fw_id))
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")
    if fw.source == "builtin":
        raise HTTPException(status_code=403, detail="Cannot delete builtin frameworks")
    await db.delete(fw)
    await db.commit()


# ── Controls CRUD ─────────────────────────────────────────────────────────────

@router.post("/{fw_id}/controls", status_code=201)
async def add_control(fw_id: str, body: ControlIn, db: AsyncSession = Depends(get_db)):
    ctrl = Control(framework_id=fw_id, **body.model_dump())
    db.add(ctrl)
    await db.commit()
    await db.refresh(ctrl)
    return {"id": ctrl.id, "ref_code": ctrl.ref_code, "title": ctrl.title}


@router.put("/{fw_id}/controls/{ctrl_id}")
async def update_control(fw_id: str, ctrl_id: str, body: ControlIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Control).where(Control.id == ctrl_id, Control.framework_id == fw_id))
    ctrl = result.scalar_one_or_none()
    if not ctrl:
        raise HTTPException(status_code=404, detail="Control not found")
    for k, v in body.model_dump().items():
        setattr(ctrl, k, v)
    await db.commit()
    return {"id": ctrl.id, "message": "Updated"}


@router.delete("/{fw_id}/controls/{ctrl_id}", status_code=204)
async def delete_control(fw_id: str, ctrl_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Control).where(Control.id == ctrl_id, Control.framework_id == fw_id))
    ctrl = result.scalar_one_or_none()
    if not ctrl:
        raise HTTPException(status_code=404, detail="Control not found")
    await db.delete(ctrl)
    await db.commit()


# ── Import / Export ───────────────────────────────────────────────────────────

@router.post("/import")
async def import_framework(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    fw_data = data.get("framework", data)
    existing = await db.execute(select(Framework).where(Framework.short_code == fw_data.get("short_code", "")))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Framework '{fw_data.get('short_code')}' already exists")

    fw = Framework(
        name=fw_data["name"],
        short_code=fw_data["short_code"],
        version=fw_data.get("version", "1.0"),
        description=fw_data.get("description"),
        source="custom",
    )
    db.add(fw)
    await db.flush()

    for ctrl_data in data.get("controls", []):
        ctrl = Control(
            framework_id=fw.id,
            ref_code=ctrl_data["ref_code"],
            title=ctrl_data["title"],
            description=ctrl_data.get("description"),
            control_type=ctrl_data.get("control_type", "preventive"),
            frequency=ctrl_data.get("frequency", "annually"),
        )
        db.add(ctrl)

    await db.commit()
    return {"id": fw.id, "name": fw.name, "message": "Framework imported"}


@router.get("/{fw_id}/export")
async def export_framework(fw_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Framework).where(Framework.id == fw_id))
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")
    controls_result = await db.execute(select(Control).where(Control.framework_id == fw_id))
    controls = controls_result.scalars().all()

    export_data = {
        "framework": {
            "name": fw.name, "short_code": fw.short_code,
            "version": fw.version, "description": fw.description,
        },
        "controls": [
            {"ref_code": c.ref_code, "title": c.title, "description": c.description,
             "control_type": c.control_type, "frequency": c.frequency, "parent_id": c.parent_id}
            for c in controls
        ],
    }
    return JSONResponse(content=export_data, headers={"Content-Disposition": f'attachment; filename="{fw.short_code}.json"'})


@router.post("/load-builtins")
async def load_builtin_frameworks(db: AsyncSession = Depends(get_db)):
    """Load all bundled framework JSON files into the database."""
    loaded = []
    if not os.path.isdir(BUILTIN_DIR):
        raise HTTPException(status_code=500, detail="Builtin frameworks directory not found")

    for fname in os.listdir(BUILTIN_DIR):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(BUILTIN_DIR, fname)) as f:
            data = json.load(f)

        fw_data = data.get("framework", {})
        existing = await db.execute(select(Framework).where(Framework.short_code == fw_data.get("short_code", "")))
        if existing.scalar_one_or_none():
            loaded.append({"name": fw_data.get("name"), "status": "already_exists"})
            continue

        fw = Framework(
            name=fw_data["name"],
            short_code=fw_data["short_code"],
            version=fw_data.get("version", "1.0"),
            description=fw_data.get("description"),
            source="builtin",
        )
        db.add(fw)
        await db.flush()

        for i, ctrl_data in enumerate(data.get("controls", [])):
            ctrl = Control(
                framework_id=fw.id,
                ref_code=ctrl_data["ref_code"],
                title=ctrl_data["title"],
                description=ctrl_data.get("description"),
                control_type=ctrl_data.get("control_type", "preventive"),
                frequency=ctrl_data.get("frequency", "annually"),
                sort_order=i,
            )
            db.add(ctrl)

        await db.commit()
        loaded.append({"name": fw.name, "short_code": fw.short_code, "status": "loaded"})

    return {"loaded": loaded}
