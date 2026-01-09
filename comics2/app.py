import os
import re
import socket
import io
from PIL import Image 
from flask import Flask, jsonify, send_from_directory, render_template, request, send_file
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
# 2️⃣ 获取系列下的所有季/卷 (Season/Volume)
# ===========================
@app.route('/api/seasons/<series_name>')
def list_seasons(series_name):
    series_path = safe_join(BASE_DIR, series_name)
    if not check_directory_exists(series_path):
        return jsonify([]), 404

    # 列出系列目录下的所有子目录作为 Season/Volume
    seasons = [d for d in os.listdir(series_path) if os.path.isdir(os.path.join(series_path, d))]
    
    # 如果没有子目录，则将系列目录本身视为一个 Season，名称为 '.' 或 series_name
    if not seasons:
        return jsonify([series_name]) # 使用系列名称作为唯一的 "Season"
        
    seasons.sort(key=natural_keys)
    return jsonify(seasons)


# ===========================
# 3️⃣ 获取指定 Season/Volume 下的所有章节
# ===========================
@app.route('/api/chapters/<series_name>/<season_name>')
def list_chapters(series_name, season_name):
    
    # 确定章节所在的实际目录
    if series_name == season_name:
        # 如果 Season Name 和 Series Name 相同，意味着文件直接放在 Series 目录下
        chapter_dir = safe_join(BASE_DIR, series_name)
    else:
        # 文件位于 Series/Season/ 目录下
        chapter_dir = safe_join(BASE_DIR, series_name, season_name)
        
    if not check_directory_exists(chapter_dir):
        # 如果目录不存在，但 Series Name == Season Name，可能是根目录为空，直接返回空
        if series_name == season_name:
            return jsonify([])
        return jsonify([]), 404 # 否则返回 404

    # 列出目录下的所有子目录作为 Chapter
    chapters = [d for d in os.listdir(chapter_dir) if os.path.isdir(os.path.join(chapter_dir, d))]
    
    # 如果没有子目录，则将 Season 目录本身视为一个 Chapter，名称为 '.' 或 season_name
    if not chapters:
        return jsonify([season_name]) # 使用 Season 名称作为唯一的 "Chapter"

    chapters.sort(key=natural_keys)
    return jsonify(chapters)


# ===========================
# 4️⃣ 获取章节内的所有图片/视频文件名 (用于前端懒加载)
# ===========================
def get_chapter_path(series_name, season_name, chapter_name):
    """根据传入的三个名称确定实际的章节目录路径"""
    if series_name == season_name and season_name == chapter_name:
        # 情况 1: 所有文件直接在 BASE_DIR/Series/ 下
        return safe_join(BASE_DIR, series_name)
    elif series_name != season_name and season_name == chapter_name:
        # 情况 2: 文件在 BASE_DIR/Series/Season/ 下 (Season/Volume 模式)
        return safe_join(BASE_DIR, series_name, season_name)
    else:
        # 情况 3: 文件在 BASE_DIR/Series/Season/Chapter/ 下 (标准模式)
        return safe_join(BASE_DIR, series_name, season_name, chapter_name)

@app.route('/chapter/<series_name>/<season_name>/<chapter_name>')
def list_chapter_files(series_name, season_name, chapter_name):
    chapter_path = get_chapter_path(series_name, season_name, chapter_name)

    if not check_directory_exists(chapter_path):
        return jsonify({'files': []}), 404

    # 定义支持的文件类型
    supported_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.mp4')
    
    # 筛选出支持的文件
    files = [f for f in os.listdir(chapter_path) if f.lower().endswith(supported_extensions)]
    
    # 排序
    files.sort(key=natural_keys)

    # 简单地返回所有文件名列表，前端负责懒加载
    return jsonify({'files': files})


# ===========================
# 5️⃣ 提供文件（图片优化/视频流式传输）
# ===========================
@app.route('/image/<series_name>/<season_name>/<chapter_name>/<filename>')
def serve_content(series_name, season_name, chapter_name, filename):
    
    directory = get_chapter_path(series_name, season_name, chapter_name)
    file_path = os.path.join(directory, filename)

    if not os.path.exists(file_path):
        return "File not found", 404
    
    # ----------------------------------------------
    # 🚀 视频文件（.mp4）流式传输优化区域 - 最终修复版本
    # ----------------------------------------------
    if filename.lower().endswith('.mp4'):
        file_path = os.path.join(directory, filename)

        if not os.path.exists(file_path):
            return "File not found", 404
            
        print(f"Serving MP4 file (Streaming via send_file): {file_path}")
        
        # 使用 send_file(conditional=True) 创建响应
        # 这是 Flask/Werkzeug 提供的最可靠的流式传输方法，能自动处理 Range 请求。
        response = send_file(
            file_path, 
            mimetype='video/mp4', 
            conditional=True # 启用 ETag 和 Range 头部支持，实现流式传输
        )
        
        # 【关键修复点】：添加 Cache-Control 头部
        # 这确保浏览器不会因为缓存过期而重复发起整个文件的请求，而是直接使用 Range 请求。
        response.headers['Cache-Control'] = 'public, max-age=3600'
        
        # 如果问题仍无法解决，强烈建议：
        # 1. 对视频文件进行 FFmpeg 优化（faststart）。
        # 2. 将漫画目录移动到 SSD 上以提高文件I/O速度。
        
        return response
    # ----------------------------------------------
    # 视频文件流式传输优化区域结束
    # ----------------------------------------------

    # --- 图像优化逻辑 (保持不变) ---
    # 如果文件不是视频，则认为是图片，进行优化处理
    # 检查是否为支持的图片格式
    if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        
        try:
            # 打开图片
            img = Image.open(file_path)
            
            # 将图片保存到内存中的字节流对象
            output = io.BytesIO()
            
            # 针对 PNG 格式进行特殊处理：转换为 RGB 模式，再进行 JPEG 压缩
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # 将图片保存为 JPEG，质量为 20 (原始设置为 20，保持不变)
            # 💡 你可以调整 quality 参数 (0-100) 来平衡文件大小和图片质量
            img.save(output, format='JPEG', quality=20) 
            output.seek(0)
            
            # 从内存发送数据，并设置正确的 MIME 类型
            return send_file(output, mimetype='image/jpeg')

        except Exception as e:
            # 如果处理失败（例如，图片文件损坏），尝试发送原始文件作为回退
            print(f"Error processing image {file_path}: {e}")
            try:
                # 使用原生的 send_from_directory 发送原始图片（不压缩）
                return send_from_directory(directory, filename) 
            except Exception as e_fallback:
                return f"Error: {str(e_fallback)}", 500
    # --- 图像优化逻辑结束 ---
    
    # 如果文件既不是视频也不是图片（不应该发生，因为已经在 list_chapter_files 过滤了）
    return "Unsupported file type", 400


# ===========================
# 6️⃣ 首页
# ===========================
@app.route('/')
def index():
    # 假设 index.html 在与 app.py 相同的目录下
    return render_template('index.html')


# ===========================
# 7️⃣ 运行
# ===========================
def get_local_ip():
    """获取本地 IP 地址"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 不需要实际连接，只是为了获取正确的网卡地址
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    port = 5000
    local_ip = get_local_ip()
    print(f"=====================================================")
    print(f"🚀 本地漫画阅读器已启动!")
    print(f"📚 漫画目录: {BASE_DIR}")
    print(f"🌐 访问地址: http://{local_ip}:{port}/")
    print(f"=====================================================")
    # 启动 Flask 应用
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True) # 使用 0.0.0.0 允许外部访问