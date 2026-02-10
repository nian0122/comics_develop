"""Flask application factory for the modular comic backend."""

from pathlib import Path
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .config import Config
from .routes.series import series_bp
from .routes.chapters import chapters_bp
from .routes.content import content_bp
from .routes.health import health_bp


def create_app(config_object: type[Config] | None = None) -> Flask:
	config_obj = config_object or Config

	app = Flask(
		__name__,
		static_folder=(
			str(config_obj.FRONTEND_DIST)
			if Path(config_obj.FRONTEND_DIST).exists()
			else None
		),
		template_folder=(
			str(config_obj.FRONTEND_DIST)
			if Path(config_obj.FRONTEND_DIST).exists()
			else None
		),
	)
	app.config.from_object(config_obj)

	# Enable CORS for API routes
	CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

	# Register blueprints
	app.register_blueprint(health_bp)
	app.register_blueprint(series_bp)
	app.register_blueprint(chapters_bp)
	app.register_blueprint(content_bp)

	# Serve built frontend if present (fallback to JSON message)
	@app.route("/")
	def index():
		dist_dir = Path(app.static_folder or "")
		index_path = dist_dir / "index.html"
		if index_path.exists():
			return send_from_directory(dist_dir, "index.html")
		return jsonify(
			{"message": "Frontend build not found. Run npm run build inside frontend/"}
		)

	if app.static_folder:
		static_root = Path(app.static_folder)

		@app.route("/assets/<path:filename>")
		def assets(filename: str):
			assets_dir = static_root / "assets"
			return send_from_directory(assets_dir, filename)

	# Health check root path for proxies
	@app.route("/health")
	def root_health():
		return jsonify({"status": "ok"})

	return app
