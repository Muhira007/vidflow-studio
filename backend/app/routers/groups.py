"""
Product Group router — maps source/ folders to product names for AI context.
"""
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import ProductGroup, Video
from app.schemas import ProductGroupResponse, ProductGroupUpdate
from app.paths import SOURCE_DIR

router = APIRouter()


@router.get("/", response_model=list[ProductGroupResponse])
def list_groups(db: Session = Depends(get_db)):
    """List all product groups with video count per group."""
    rows = (
        db.query(
            ProductGroup,
            func.count(Video.id).label("video_count"),
        )
        .outerjoin(Video, Video.source_folder == ProductGroup.id)
        .group_by(ProductGroup.id)
        .order_by(ProductGroup.id)
        .all()
    )

    results = []
    for group, count in rows:
        results.append(
            ProductGroupResponse(
                id=group.id,
                product_name=group.product_name or "",
                product_description=group.product_description,
                video_count=count,
                created_at=group.created_at,
                updated_at=group.updated_at,
            )
        )
    return results


@router.get("/{group_id}", response_model=ProductGroupResponse)
def get_group(group_id: str, db: Session = Depends(get_db)):
    """Get a single product group by ID (folder name)."""
    group = db.query(ProductGroup).filter(ProductGroup.id == group_id).first()
    if not group:
        # Return a virtual group if folder exists on disk
        folder_path = os.path.join(SOURCE_DIR, group_id)
        if os.path.isdir(folder_path):
            video_count = (
                db.query(func.count(Video.id))
                .filter(Video.source_folder == group_id)
                .scalar()
            )
            return ProductGroupResponse(
                id=group_id,
                product_name="",
                product_description=None,
                video_count=video_count or 0,
                created_at=None,
                updated_at=None,
            )
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Group '{group_id}' not found")

    video_count = (
        db.query(func.count(Video.id))
        .filter(Video.source_folder == group_id)
        .scalar()
    )
    return ProductGroupResponse(
        id=group.id,
        product_name=group.product_name or "",
        product_description=group.product_description,
        video_count=video_count or 0,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.put("/{group_id}", response_model=ProductGroupResponse)
def update_group(group_id: str, data: ProductGroupUpdate, db: Session = Depends(get_db)):
    """Create or update a product group's name and description."""
    group = db.query(ProductGroup).filter(ProductGroup.id == group_id).first()

    if not group:
        # Auto-create if folder exists
        folder_path = os.path.join(SOURCE_DIR, group_id)
        if not os.path.isdir(folder_path):
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail=f"Folder '{group_id}' tidak ditemukan di source/. Sync dulu dari File Explorer atau halaman ini.",
            )
        group = ProductGroup(id=group_id)
        db.add(group)

    if data.product_name is not None:
        group.product_name = data.product_name
    if data.product_description is not None:
        group.product_description = data.product_description

    db.commit()
    db.refresh(group)

    video_count = (
        db.query(func.count(Video.id))
        .filter(Video.source_folder == group_id)
        .scalar()
    )
    return ProductGroupResponse(
        id=group.id,
        product_name=group.product_name or "",
        product_description=group.product_description,
        video_count=video_count or 0,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.post("/sync", response_model=dict)
def sync_groups(db: Session = Depends(get_db)):
    """Scan source/ directory and create ProductGroup records for new folders."""
    if not os.path.isdir(SOURCE_DIR):
        return {"message": f"Folder source/ tidak ditemukan di {SOURCE_DIR}", "created": 0, "total": 0}

    created = 0
    existing_ids = {g.id for g in db.query(ProductGroup.id).all()}

    for entry in os.listdir(SOURCE_DIR):
        entry_path = os.path.join(SOURCE_DIR, entry)
        if os.path.isdir(entry_path) and entry not in existing_ids:
            group = ProductGroup(id=entry, product_name="")
            db.add(group)
            existing_ids.add(entry)
            created += 1

    db.commit()

    total = db.query(func.count(ProductGroup.id)).scalar()
    return {
        "message": f"Sync selesai. {created} grup baru dibuat.",
        "created": created,
        "total": total or 0,
    }
