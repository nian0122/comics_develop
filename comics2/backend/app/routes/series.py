"""Series listing endpoints."""

from flask import Blueprint, jsonify

from ..services.filesystem import base_dir, list_directories


series_bp = Blueprint("series", __name__)


@series_bp.route("/api/series", methods=["GET"])
@series_bp.route("/series", methods=["GET"])
def list_series():
	series = list_directories(base_dir())
	return jsonify({"items": series})
