"""Application configuration for the modular Flask backend."""

from pathlib import Path
import os


class Config:
	"""Default application configuration."""

	# Core comic library settings
	BASE_DIR: str = os.getenv(
		"COMICS_BASE_DIR", str(Path(__file__).resolve().parents[3] / "data" / "comics")
	)
	IMAGE_QUALITY: int = int(os.getenv("COMICS_IMAGE_QUALITY", "70"))
	MAX_FILES_PER_CHAPTER: int = int(os.getenv("COMICS_MAX_FILES", "2000"))
	ALLOWED_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
	ALLOWED_VIDEO_EXTENSIONS = (".mp4",)

	# Caching & CORS
	SEND_FILE_MAX_AGE_DEFAULT = 60 * 60  # 1 hour
	CORS_ORIGINS = os.getenv("COMICS_CORS_ORIGINS", "*")

	# Frontend build directory (optional, only if you run `npm run build` inside frontend)
	FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
