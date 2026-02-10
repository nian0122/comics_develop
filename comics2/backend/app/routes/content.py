"""Content serving endpoints (images/videos)."""

from flask import Blueprint, abort, current_app, send_file

from ..services.filesystem import (
	base_dir,
	build_chapter_path,
	image_as_jpeg_bytes,
	validate_path,
)


content_bp = Blueprint("content", __name__)


@content_bp.route(
	"/api/content/<series_name>/<season_name>/<chapter_name>/<filename>",
	methods=["GET"],
)
@content_bp.route(
	"/image/<series_name>/<season_name>/<chapter_name>/<filename>",
	methods=["GET"],
)
def serve_content(series_name: str, season_name: str, chapter_name: str, filename: str):
	root = base_dir()
	chapter_path = validate_path(
		build_chapter_path(series_name, season_name, chapter_name, root)
	)
	file_path = validate_path(chapter_path / filename)

	if not file_path.exists() or not file_path.is_file():
		abort(404, description="File not found")

	# Video streaming handled by Werkzeug via conditional=True
	if file_path.suffix.lower() in current_app.config.get(
		"ALLOWED_VIDEO_EXTENSIONS", (".mp4",)
	):
		response = send_file(
			file_path,
			mimetype="video/mp4",
			conditional=True,
			max_age=current_app.config.get("SEND_FILE_MAX_AGE_DEFAULT"),
		)
		response.headers["Cache-Control"] = "public, max-age=3600"
		return response

	if file_path.suffix.lower() in current_app.config.get(
		"ALLOWED_IMAGE_EXTENSIONS", (".jpg",)
	):
		try:
			buffer = image_as_jpeg_bytes(
				file_path, quality=current_app.config.get("IMAGE_QUALITY", 70)
			)
			return send_file(buffer, mimetype="image/jpeg")
		except Exception as exc:  # noqa: BLE001
			current_app.logger.warning("Image conversion failed: %s", exc)
			return send_file(file_path)

	abort(400, description="Unsupported file type")
