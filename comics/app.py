import os
import re
import socket
import io
from PIL import Image 
from flask import Flask, jsonify, send_from_directory, render_template, request, send_file # 👈 send_file 用于发送内存中的图片
from werkzeug.utils import safe_join

app = Flask(__name__, static_folder=None)

# ===========================
# 配置漫画主文件夹（含多个系列）
# ===========================
BASE_DIR = r"F:\games\comics"  # 修改为你的漫画目录


# ===========================
# 自然排序函数
# ===========================
def atoi(text):
    return int(text) if text.isdigit() else text.lower()

def natural_keys(text):
    return [atoi(c) for c in re.split(r'(\d+)', text)]


# ===========================
# 检查目录是否存在
# ===========================
def check_directory_exists(path):
    return os.path.exists(path) and os.path.isdir(path)


# ===========================
# 1️⃣ 获取所有漫画系列
# ===========================
@app.route('/series')
def list_series():
    if not check_directory_exists(BASE_DIR):
        return jsonify([])

    series = [d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d))]
    series.sort(key=natural_keys)
    return jsonify(series)


# ===========================
# 2️⃣ 获取某漫画下所有“季”
# ===========================
@app.route('/api/seasons/<path:series>')
def api_seasons(series):
    series_path = safe_join(BASE_DIR, series)
    if not check_directory_exists(series_path):
        return jsonify([])

    seasons = [d for d in os.listdir(series_path) if os.path.isdir(os.path.join(series_path, d))]
    seasons.sort(key=natural_keys)
    return jsonify(seasons)


# ===========================
# 3️⃣ 获取指定“季”下的所有章节
# ===========================
@app.route('/api/chapters/<path:series>/<path:season>')
def api_chapters(series, season):
    season_path = safe_join(BASE_DIR, series, season)
    if not check_directory_exists(season_path):
        return jsonify([])

    chapters = [d for d in os.listdir(season_path) if os.path.isdir(os.path.join(season_path, d))]
    chapters.sort(key=natural_keys)
    return jsonify(chapters)


# ===========================
# 4️⃣ 获取章节下的所有图片（分页）
# ===========================
@app.route('/chapter/<path:series>/<path:season>/<path:chapter>')
def list_images(series, season, chapter):
    path = safe_join(BASE_DIR, series, season, chapter)
    if not check_directory_exists(path):
        return jsonify([])

    images = [f for f in os.listdir(path)
              if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'))]
    images.sort(key=natural_keys)

    # 分页参数
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 5))
    start = (page - 1) * per_page
    end = start + per_page

    paginated_images = images[start:end]
    return jsonify({
        'page': page,
        'per_page': per_page,
        'total': len(images),
        'images': paginated_images
    })


# ===========================
# 5️⃣ 提供图片访问 (优化压缩)
# ===========================
@app.route('/image/<path:series>/<path:season>/<path:chapter>/<path:filename>')
def serve_image(series, season, chapter, filename):
    directory = safe_join(BASE_DIR, series, season, chapter)
    image_path = safe_join(directory, filename)

    if not check_directory_exists(directory) or not os.path.exists(image_path):
        return "Not found", 404
    
    # --- 图像优化逻辑开始 ---
    try:
        # 打开图片
        img = Image.open(image_path)
        
        # 将图片保存到内存中的字节流对象
        output = io.BytesIO()
        
        # 针对 PNG 格式进行特殊处理：转换为 RGB 模式，再进行 JPEG 压缩
        # JPEG 不支持透明度，转换为 RGB 以便压缩
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # 将图片保存为 JPEG，质量为 85
        # 💡 你可以调整 quality 参数 (0-100) 来平衡文件大小和图片质量
        img.save(output, format='JPEG', quality=85) 
        output.seek(0)
        
        # 从内存发送数据，并设置正确的 MIME 类型
        return send_file(output, mimetype='image/jpeg')

    except Exception as e:
        # 如果处理失败（例如，图片文件损坏），尝试发送原始文件作为回退
        print(f"Error processing image {image_path}: {e}")
        try:
            return send_from_directory(directory, filename) # 使用原生的 send_from_directory
        except Exception as e_fallback:
            return f"Error: {str(e_fallback)}", 500
    # --- 图像优化逻辑结束 ---


# ===========================
# 6️⃣ 首页
# ===========================
@app.route('/')
def index():
    # 假设 index.html 在与 app.py 相同的目录下
    return render_template('index.html')


# ===========================
# 启动应用
# ===========================
if __name__ == "__main__":
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    print("\n  多层级漫画浏览器已启动！")
    print(f"  本机访问地址:  http://127.0.0.1:5000")
    print(f"  局域网访问地址: http://{local_ip}:5000\n")

    # 确保在生产环境中关闭 debug=True
    app.run(host='0.0.0.0', port=5000, debug=True)