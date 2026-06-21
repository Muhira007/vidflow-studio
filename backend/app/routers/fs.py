from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import os
import shutil
from typing import List

router = APIRouter()
BASE_DIR = "/home/kangdemuh/aplikasi/video-editor/claude2/source"

@router.get("/list")
def list_directory():
    os.makedirs(BASE_DIR, exist_ok=True)
    items = []
    for item in os.listdir(BASE_DIR):
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isdir(item_path):
            files = os.listdir(item_path)
            items.append({
                "name": item,
                "type": "folder",
                "files": files
            })
    # Sort folders alphabetically
    items.sort(key=lambda x: x["name"])
    return {"items": items}

@router.post("/mkdir")
def create_folder(name: str = Form(...)):
    if not name or ".." in name or "/" in name:
        raise HTTPException(status_code=400, detail="Invalid folder name")
    
    target_dir = os.path.join(BASE_DIR, name)
    if os.path.exists(target_dir):
        raise HTTPException(status_code=400, detail="Folder already exists")
        
    os.makedirs(target_dir, exist_ok=True)
    return {"message": f"Folder {name} created"}

@router.post("/rename")
def rename_folder(old_name: str = Form(...), new_name: str = Form(...)):
    if not new_name or ".." in new_name or "/" in new_name:
        raise HTTPException(status_code=400, detail="Invalid new folder name")
        
    old_path = os.path.join(BASE_DIR, old_name)
    new_path = os.path.join(BASE_DIR, new_name)
    
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Source folder not found")
    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="Target folder already exists")
        
    os.rename(old_path, new_path)
    
    # Optional: Update DB to reflect the new video_id?
    # We can rely on the sync functionality later, or just rename it.
    
    return {"message": "Folder renamed"}

@router.delete("/delete/{name}")
def delete_folder(name: str):
    target_dir = os.path.join(BASE_DIR, name)
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Folder not found")
        
    try:
        shutil.rmtree(target_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Folder deleted"}

@router.delete("/delete_file/{folder}/{filename}")
def delete_file(folder: str, filename: str):
    target_file = os.path.join(BASE_DIR, folder, filename)
    if not os.path.exists(target_file):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(target_file)
    return {"message": "File deleted"}
