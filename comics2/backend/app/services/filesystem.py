"""Filesystem helpers for browsing comic libraries safely."""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import List, Tuple

from flask import current_app
from PIL import Image


def atoi(text: str):
	return int(text) if text.isdigit() else text.lower()


def natural_keys(text: str):
	return [atoi(c) for c in re.split(r"(\d+)", text)]


def is_safe_path(base_dir: Path, target: Path) -> bool:
	try:
		target.relative_to(base_dir)
		return True
	except ValueError:
		return False


def list_directories(path: Path) -> List[str]:
	if not path.exists() or not path.is_dir():
		return []
	dirs = [p.name for p in path.iterdir() if p.is_dir()]
	dirs.sort(key=natural_keys)
	return dirs


def build_chapter_path(series: str, season: str, chapter: str, base_dir: Path) -> Path:
	if series == season == chapter:
		return base_dir / series
	if series != season and season == chapter:
		return base_dir / series / season
	return base_dir / series / season / chapter


def list_files(path: Path, allowed_ext: Tuple[str, ...], limit: int) -> List[str]:
	if not path.exists() or not path.is_dir():
		return []
	files = [
		f.name for f in path.iterdir() if f.is_file() and f.suffix.lower() in allowed_ext
	]
	files.sort(key=natural_keys)
	return files[:limit]


def image_as_jpeg_bytes(path: Path, quality: int) -> io.BytesIO:
	img = Image.open(path)
	if img.mode in ("RGBA", "P"):
		img = img.convert("RGB")
	buffer = io.BytesIO()
	img.save(buffer, format="JPEG", quality=quality)
	buffer.seek(0)
	return buffer


def base_dir() -> Path:
	return Path(current_app.config.get("BASE_DIR")).expanduser().resolve()


def validate_path(path: Path) -> Path:
	root = base_dir()
	resolved = path.resolve()
	if not is_safe_path(root, resolved):
		raise PermissionError("Attempted path traversal outside base directory")
	return resolved
