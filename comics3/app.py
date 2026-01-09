import os
import re
import socket
import io
from PIL import Image 
from flask import Flask, jsonify, send_from_directory, render_template, request, send_file
from werkzeug.utils import safe_join
import logging 

# 配置基本的日志记录
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)

# ===========================
# 配置漫画主文件夹（含多个系列）
# ===========================
# BASE_DIR = r"F:\games\comics\写真"  # 修改为你的漫画目录
BASE_DIR = r"F:\games\comics\写真\色点屋"  # 修改为你的漫画目录

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
    exists = os.path.exists(path) and os.path.isdir(path)
    # logging.debug(f"Checking directory: {path}. Exists: {exists}")
    return exists

# 定义支持的文件类型：添加 '.mov'
SUPPORTED_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov')

# ===========================
# 新的递归 Chapter 发现函数
# ===========================
def find_chapters_recursive(series_path, current_rel_path=""):
    """
    递归查找包含媒体文件的目录，将其视为一个 Chapter。
    返回相对路径列表 (relative to BASE_DIR)。
    """
    full_path = safe_join(series_path, current_rel_path)
    if not check_directory_exists(full_path):
        print(f"DEBUG: Directory not found or not a directory: {full_path}")
        return []

    # 检查当前目录是否包含媒体文件
    files_in_dir = [f for f in os.listdir(full_path) if f.lower().endswith(SUPPORTED_EXTENSIONS)]

    if files_in_dir:
        # 如果包含媒体文件，则当前目录就是一个 Chapter
        print(f"INFO: Found Chapter: {current_rel_path} with {len(files_in_dir)} files.")
        return [current_rel_path]
    else:
        # 如果不包含媒体文件，则继续递归查找子目录
        chapters = []
        subdirs = [d for d in os.listdir(full_path) if os.path.isdir(os.path.join(full_path, d))]
        
        # 自然排序子目录，保持章节顺序
        subdirs.sort(key=natural_keys)

        for subdir in subdirs:
            # 构造新的相对路径
            new_rel_path = os.path.join(current_rel_path, subdir).replace('\\', '/')
            # 递归调用
            chapters.extend(find_chapters_recursive(series_path, new_rel_path))
        
        return chapters


# ===========================
# 1️⃣ 获取所有漫画系列
# ===========================
@app.route('/series')
def list_series():
    print(f"INFO: Received request for /series from {request.remote_addr}")
    if not check_directory_exists(BASE_DIR):
        print(f"ERROR: BASE_DIR not found or not a directory: {BASE_DIR}")
        return jsonify([])

    # 仅返回包含子目录（可能是 Chapter 或另一个 Series）的目录作为系列
    series = [d for d in os.listdir(BASE_DIR) 
              if os.path.isdir(os.path.join(BASE_DIR, d))]
    series.sort(key=natural_keys)
    print(f"INFO: Found {len(series)} series.")
    return jsonify(series)


# ===========================
# 2️⃣ 获取指定 Series 下的所有章节 (现在是扁平列表)
# ===========================
@app.route('/api/chapters/<series_name>')
def list_chapters_flat(series_name):
    print(f"INFO: Received request for chapters in series: {series_name}")
    series_path = safe_join(BASE_DIR, series_name)
    if not check_directory_exists(series_path):
        print(f"WARNING: Series directory not found: {series_path}")
        return jsonify([]), 404

    # 使用新的递归函数查找所有章节的相对路径
    relative_chapter_paths = find_chapters_recursive(series_path)
    
    chapters_data = []
    for rel_path in relative_chapter_paths:
        chapter_name = os.path.basename(rel_path) if rel_path else series_name 
        chapter_path_id = rel_path.replace('\\', '/')
        chapters_data.append({
            'name': chapter_name,
            'path_id': chapter_path_id 
        })
        
    print(f"INFO: Found {len(chapters_data)} chapters for series: {series_name}")
    return jsonify(chapters_data)


# ===========================
# 3️⃣ 获取章节内的所有图片/视频文件名 (用于前端懒加载)
# ===========================
def get_chapter_full_path(series_name, chapter_path_id):
    """根据传入的系列名和章节路径 ID 确定实际的章节目录绝对路径"""
    full_path = safe_join(BASE_DIR, series_name, chapter_path_id)
    print(f"DEBUG: Resolved chapter path: {full_path}")
    return full_path

@app.route('/chapter/<series_name>/<path:chapter_path_id>')
def list_chapter_files(series_name, chapter_path_id):
    print(f"INFO: Received request for files in chapter: {series_name}/{chapter_path_id}")
    chapter_path = get_chapter_full_path(series_name, chapter_path_id)

    if not check_directory_exists(chapter_path):
        print(f"WARNING: Chapter directory not found: {chapter_path}")
        return jsonify({'files': []}), 404

    files = [f for f in os.listdir(chapter_path) if f.lower().endswith(SUPPORTED_EXTENSIONS)]
    
    files.sort(key=natural_keys)
    
    print(f"INFO: Chapter {series_name}/{chapter_path_id} contains {len(files)} supported files.")
    return jsonify({'files': files})


# ===========================
# 4️⃣ 提供低质量文件（图片压缩质量 20 / 视频流式传输）
# ===========================
@app.route('/image/<series_name>/<path:chapter_path_id>/<filename>')
def serve_content(series_name, chapter_path_id, filename):
    
    print(f"INFO: Serving content (Quality 20): {series_name}/{chapter_path_id}/{filename}")
    
    directory = get_chapter_full_path(series_name, chapter_path_id)
    file_path = os.path.join(directory, filename)

    if not os.path.exists(file_path):
        print(f"ERROR: File not found at path: {file_path}")
        return "File not found", 404
    
    # ----------------------------------------------
    # 🚀 视频文件（.mp4 和 .mov）流式传输优化区域
    # ----------------------------------------------
    lower_filename = filename.lower()
    if lower_filename.endswith(('.mp4', '.mov')):
        
        # 根据文件类型确定 MIME type
        mimetype = 'video/mp4' if lower_filename.endswith('.mp4') else 'video/quicktime'
        
        print(f"SUCCESS: Serving Video file ({mimetype}, Streaming via send_file): {file_path}")
        
        response = send_file(
            file_path, 
            mimetype=mimetype, 
            conditional=True # 启用 ETag 和 Range 头部支持，实现流式传输
        )
        
        response.headers['Cache-Control'] = 'public, max-age=3600'
        
        return response
    # ----------------------------------------------
    # 视频文件流式传输优化区域结束
    # ----------------------------------------------

    # --- 图像优化逻辑 (低画质，质量 12) ---
    if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        
        try:
            print(f"DEBUG: Processing image for optimization: {file_path}")
            # 打开图片
            img = Image.open(file_path)
            
            # 将图片保存到内存中的字节流对象
            output = io.BytesIO()
            
            # 针对 PNG 格式进行特殊处理：转换为 RGB 模式，再进行 JPEG 压缩
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # 将图片保存为 JPEG，质量为 12 
            img.save(output, format='JPEG', quality=10)
            output.seek(0)
            
            print(f"SUCCESS: Image processed and served as JPEG (quality=50).")
            # 从内存发送数据，并设置正确的 MIME 类型
            return send_file(output, mimetype='image/jpeg')

        except Exception as e:
            # 如果处理失败（例如，图片文件损坏），尝试发送原始文件作为回退
            print(f"ERROR: Failed to process image {file_path}: {e}. Falling back to original file.")
            try:
                # 使用原生的 send_from_directory 发送原始图片（不压缩）
                return send_from_directory(directory, filename) 
            except Exception as e_fallback:
                print(f"FATAL: Fallback failed for {file_path}: {e_fallback}")
                return f"Error: {str(e_fallback)}", 500
    # --- 图像优化逻辑结束 ---
    
    # 如果文件既不是视频也不是图片
    print(f"WARNING: Unsupported file type requested: {filename}")
    return "Unsupported file type", 400


# ===========================
# 4.1️⃣ 提供高质量图片（用于长按放大）
# ===========================
@app.route('/hq_image/<series_name>/<path:chapter_path_id>/<filename>')
def serve_high_quality_image(series_name, chapter_path_id, filename):
    
    print(f"INFO: Serving High Quality content (Quality 80): {series_name}/{chapter_path_id}/{filename}")
    
    directory = get_chapter_full_path(series_name, chapter_path_id)
    file_path = os.path.join(directory, filename)

    if not os.path.exists(file_path):
        print(f"ERROR: File not found at path: {file_path}")
        return "File not found", 404
    
    # --- 图像优化逻辑 (高画质，质量 100) ---
    if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        
        try:
            print(f"DEBUG: Processing image for High Quality (100): {file_path}")
            img = Image.open(file_path)
            output = io.BytesIO()
            
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # 关键修改点：将质量设置为 100
            img.save(output, format='JPEG', quality=100) 
            output.seek(0)
            
            print(f"SUCCESS: High Quality Image processed and served as JPEG (quality=100).")
            return send_file(output, mimetype='image/jpeg')

        except Exception as e:
            print(f"ERROR: Failed to process HQ image {file_path}: {e}. Falling back to original file.")
            try:
                # 高清失败时回退到发送原始文件
                return send_from_directory(directory, filename) 
            except Exception as e_fallback:
                print(f"FATAL: Fallback failed for {file_path}: {e_fallback}")
                return f"Error: {str(e_fallback)}", 500
    
    # 如果不是支持的图片类型，但请求了高清路由
    print(f"WARNING: HQ request for unsupported file type: {filename}")
    return "Unsupported file type", 400


# ===========================
# 5️⃣ 首页 (保持不变)
# ===========================
@app.route('/')
def index():
    print(f"INFO: Serving index page to {request.remote_addr}")
    return render_template('index.html')


# ===========================
# 6️⃣ 运行 (仅使用 Flask 自带服务器)
# ===========================
def get_local_ip():
    """获取本地 IP 地址"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1)) 
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    port = 500
    host = '0.0.0.0'
    local_ip = get_local_ip()
    
    print(f"=====================================================")
    print(f"🚀 本地漫画阅读器已启动!")
    print(f"📚 漫画目录: {BASE_DIR}")
    print(f"=====================================================")
    print(f"INFO: Starting server at http://{local_ip}:{port} (IPv4)")
    print(f"INFO: Starting server at http://[::]:{port} (IPv6/Dual-Stack)") # 添加 IPv6 提示

    app.run(host=host, port=port, debug=True, threaded=True)