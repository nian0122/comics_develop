"""Season and chapter discovery endpoints."""

from flask import Blueprint, jsonify, abort, current_app

from ..services.filesystem import (
	base_dir,
	build_chapter_path,
	list_directories,
	list_files,
	validate_path,
)


chapters_bp = Blueprint("chapters", __name__)


@chapters_bp.route("/api/seasons/<series_name>", methods=["GET"])
@chapters_bp.route("/seasons/<series_name>", methods=["GET"])
def list_seasons(series_name: str):
	series_path = validate_path(base_dir() / series_name)
	seasons = list_directories(series_path)
	if not seasons:
		return jsonify({"items": [series_name]})
	return jsonify({"items": seasons})


@chapters_bp.route("/api/chapters/<series_name>/<season_name>", methods=["GET"])
@chapters_bp.route("/chapters/<series_name>/<season_name>", methods=["GET"])
def list_chapters(series_name: str, season_name: str):
	chapter_dir = build_chapter_path(series_name, season_name, season_name, base_dir())
	if not chapter_dir.exists():
		abort(404, description="Season not found")

	chapters = list_directories(chapter_dir)
	if not chapters:
		return jsonify({"items": [season_name]})
	return jsonify({"items": chapters})


@chapters_bp.route(
	"/api/chapter/<series_name>/<season_name>/<chapter_name>",
	methods=["GET"],
)
@chapters_bp.route(
	"/chapter/<series_name>/<season_name>/<chapter_name>", methods=["GET"]
)
def list_chapter_files(series_name: str, season_name: str, chapter_name: str):
	root = base_dir()
	chapter_path = validate_path(
		build_chapter_path(series_name, season_name, chapter_name, root)
	)

	allowed = (
		*current_app.config.get("ALLOWED_IMAGE_EXTENSIONS", ()),
		*current_app.config.get("ALLOWED_VIDEO_EXTENSIONS", ()),
	)
	max_files = current_app.config.get("MAX_FILES_PER_CHAPTER", 2000)
	files = list_files(chapter_path, allowed_ext=allowed, limit=max_files)
	return jsonify({"files": files})
