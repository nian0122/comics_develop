import os
import re
import socket
import io
import json 
import time
from PIL import Image 
from flask import Flask, jsonify, send_from_directory, render_template, request, send_file
from werkzeug.utils import safe_join

# 引入 Redis 客户端
import redis

# ===========================
# Redis 配置 - 从环境变量读取主机名
# ===========================
# 优先从环境变量获取配置，如果未设置，则使用默认的本地配置
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379)) 
CACHE_EXPIRATION = int(os.environ.get('CACHE_EXPIRATION', 604800)) # 缓存过期时间 (秒)
# 漫画内容根目录 (API 扫描使用) - 在 Docker 中是 /comics
COMICS_ROOT_DIR = os.environ.get('COMICS_ROOT_DIR', r"F:\games\comics") 
# 高质量图片子目录 (API 扫描使用) - 在 Docker 中是 /comics/h_photograph
HQ_SUB_DIR = os.environ.get('HQ_SUB_DIR', 'h_photograph')
# 低质量图片子目录 (图片服务使用) - 在 Docker 中是 /comics/l_photograph
LQ_SUB_DIR = os.environ.get('LQ_SUB_DIR', 'l_photograph')

try:
    # 使用从环境变量读取的主机名
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
    r.ping()
    print(f"INFO: Redis connection established successfully at {REDIS_HOST}:{REDIS_PORT}.")
    REDIS_ENABLED = True
except redis.exceptions.ConnectionError as e:
    # 在 Docker Compose 中，如果 Redis 服务未启动，这里会报错
    print(f"ERROR: Could not connect to Redis at {REDIS_HOST}:{REDIS_PORT}. Caching is disabled. Error: {e}")
    REDIS_ENABLED = False
    
app = Flask(__name__, static_folder=None)

# ===========================
# 配置漫画主文件夹（从环境变量读取）
# =========================================================================
# 在 Docker Compose 中， HIGH_QUALITY_BASE_DIR 应设置为挂载卷的容器内部路径，例如 /comics/h_photograph
# 在本地直接运行时，它将使用默认的 Windows 路径
HIGH_QUALITY_BASE_DIR = os.environ.get('HIGH_QUALITY_BASE_DIR', r"F:\games\comics\h_photograph")
print(f"INFO: Using BASE_DIR: {HIGH_QUALITY_BASE_DIR}")
# =========================================================================

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
    return exists

# 定义支持的文件类型：图片和视频
SUPPORTED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')
SUPPORTED_VIDEO_EXTENSIONS = ('.mp4', '.mov')
# 用于扫描目录的集合
SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS + SUPPORTED_VIDEO_EXTENSIONS


# ===========================
# 递归 Chapter 发现函数
# ===========================
def find_chapters_recursive(series_path, current_rel_path=""):
    """
    递归查找包含媒体文件的目录，将其视为一个 Chapter。
    返回相对路径列表 (relative to HIGH_QUALITY_BASE_DIR)。
    """
    full_path = safe_join(series_path, current_rel_path)
    if not check_directory_exists(full_path):
        return []

    # 检查当前目录是否包含媒体文件
    files_in_dir = [f for f in os.listdir(full_path) if f.lower().endswith(SUPPORTED_EXTENSIONS)]

    if files_in_dir:
        # 如果包含媒体文件，则当前目录就是一个 Chapter
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
# 1️⃣ 获取所有漫画系列 (使用 Redis 缓存优化)
# (保持不变)
# ===========================
@app.route('/series')
def list_series():
    print(f"INFO: Received request for /series from {request.remote_addr}")
    if not check_directory_exists(HIGH_QUALITY_BASE_DIR):
        print(f"ERROR: HIGH_QUALITY_BASE_DIR not found or not a directory: {HIGH_QUALITY_BASE_DIR}")
        return jsonify([])

    CACHE_KEY = 'series_list'

    # 1. 尝试从 Redis 读取缓存
    if REDIS_ENABLED:
        cached_data = r.get(CACHE_KEY)
        if cached_data:
            print(f"INFO: Serving series list from Redis cache.")
            return jsonify(json.loads(cached_data))

    # 2. 缓存未命中或 Redis 未启用，执行文件系统扫描
    series = [d for d in os.listdir(HIGH_QUALITY_BASE_DIR) 
              if os.path.isdir(os.path.join(HIGH_QUALITY_BASE_DIR, d))]
    series.sort(key=natural_keys)
    print(f"INFO: Found {len(series)} series (from filesystem).")

    # 3. 将结果存入 Redis
    if REDIS_ENABLED:
        r.setex(CACHE_KEY, CACHE_EXPIRATION, json.dumps(series))
        print(f"INFO: Series list cached in Redis.")

    return jsonify(series)


# ===========================
# 2️⃣ 获取指定 Series 下的所有章节 (使用 Redis 缓存优化)
# (保持不变)
# ===========================
@app.route('/api/chapters/<series_name>')
def list_chapters_flat(series_name):
    print(f"INFO: Received request for chapters in series: {series_name}")
    series_path = safe_join(HIGH_QUALITY_BASE_DIR, series_name)
    if not check_directory_exists(series_path):
        print(f"WARNING: Series directory not found: {series_path}")
        return jsonify([]), 404

    CACHE_KEY = f'chapters_list:{series_name}'

    # 1. 尝试从 Redis 读取缓存
    if REDIS_ENABLED:
        cached_data = r.get(CACHE_KEY)
        if cached_data:
            print(f"INFO: Serving chapters list for {series_name} from Redis cache.")
            return jsonify(json.loads(cached_data))

    # 2. 缓存未命中，执行昂贵的文件系统递归扫描
    relative_chapter_paths = find_chapters_recursive(series_path)
    
    chapters_data = []
    for rel_path in relative_chapter_paths:
        chapter_name = os.path.basename(rel_path) if rel_path else series_name 
        chapter_path_id = rel_path.replace('\\', '/')
        chapters_data.append({
            'name': chapter_name,
            'path_id': chapter_path_id 
        })
        
    print(f"INFO: Found {len(chapters_data)} chapters for series: {series_name} (from filesystem).")

    # 3. 将结果存入 Redis
    if REDIS_ENABLED:
        r.setex(CACHE_KEY, CACHE_EXPIRATION, json.dumps(chapters_data))
        print(f"INFO: Chapters list for {series_name} cached in Redis.")

    return jsonify(chapters_data)


# ===========================
# 3️⃣ 获取章节内的所有图片/视频文件名 (使用 Redis 缓存优化)
# (保持不变)
# ===========================
def get_chapter_full_path(series_name, chapter_path_id):
    """根据传入的系列名和章节路径 ID 确定实际的章节目录绝对路径"""
    full_path = safe_join(COMICS_ROOT_DIR, HQ_SUB_DIR, series_name, chapter_path_id)
    return full_path

@app.route('/chapter/<series_name>/<path:chapter_path_id>')
def list_chapter_files(series_name, chapter_path_id):
    print(f"INFO: Received request for files in chapter: {series_name}/{chapter_path_id}")
    
    CACHE_KEY = f'chapter_files:{series_name}:{chapter_path_id}'
    
    # 1. 尝试从 Redis 读取缓存
    if REDIS_ENABLED:
        cached_data = r.get(CACHE_KEY)
        if cached_data:
            print(f"INFO: Serving chapter files for {series_name}/{chapter_path_id} from Redis cache.")
            return jsonify({'files': json.loads(cached_data)})


    # 2. 缓存未命中，执行文件系统扫描
    chapter_path = get_chapter_full_path(series_name, chapter_path_id)

    if not check_directory_exists(chapter_path):
        print(f"WARNING: Chapter directory not found: {chapter_path}")
        return jsonify({'files': []}), 404

    files = [f for f in os.listdir(chapter_path) if f.lower().endswith(SUPPORTED_EXTENSIONS)]
    
    files.sort(key=natural_keys)
    
    print(f"INFO: Chapter {series_name}/{chapter_path_id} contains {len(files)} supported files (from filesystem).")
    
    # 3. 将结果存入 Redis
    if REDIS_ENABLED:
        # 注意：这里只缓存文件名的列表，返回时需要包装成 {'files': ...}
        r.setex(CACHE_KEY, CACHE_EXPIRATION, json.dumps(files))
        print(f"INFO: Chapter files list for {series_name}/{chapter_path_id} cached in Redis.")

    return jsonify({'files': files})

# ===========================
# 4️⃣ 提供低质量图片 (优化版 - 直接服务预处理文件)
# ===========================
@app.route('/image/<series_name>/<path:chapter_path_id>/<filename>')
def serve_low_quality_image(series_name, chapter_path_id, filename):
    
    print(f"INFO: Serving content (Format: WEBP, Pre-processed): {series_name}/{chapter_path_id}/{filename}")
    
    # 1. 确定低质量目录的绝对路径
    # 路径结构: COMICS_ROOT_DIR/LQ_SUB_DIR/series_name/chapter_path_id
    # 在 Docker 中: /comics/l_photograph/series_name/chapter_path_id
    low_quality_directory = safe_join(COMICS_ROOT_DIR, LQ_SUB_DIR, series_name, chapter_path_id)
    
    # 2. 确定目标低质量文件名 (WebP 格式)
    # 替换原始文件的扩展名
    base_filename, _ = os.path.splitext(filename)
    low_quality_filename = base_filename + '.webp'
    
    low_quality_file_path = os.path.join(low_quality_directory, low_quality_filename)

    if not os.path.exists(low_quality_file_path):
        print(f"WARNING: Pre-processed WebP file not found: {low_quality_file_path}. Attempting to serve high-quality original.")
        
        # 3. 如果低质量文件不存在，则回退到服务高质量原文件
        hq_directory = safe_join(COMICS_ROOT_DIR, HQ_SUB_DIR, series_name, chapter_path_id)
        hq_file_path = os.path.join(hq_directory, filename)

        if os.path.exists(hq_file_path):
            print(f"INFO: Serving high-quality file as fallback: {hq_file_path}")
            # 使用 send_from_directory 服务原始文件
            return send_from_directory(hq_directory, filename)
        else:
            print(f"ERROR: High-quality source file not found either: {hq_file_path}")
            return "File not found", 404

    # 4. 如果低质量文件存在，直接服务它
    print(f"SUCCESS: Serving pre-processed WebP file: {low_quality_file_path}")
    
    # 使用 send_from_directory 服务预处理文件
    response = send_from_directory(low_quality_directory, low_quality_filename, mimetype='image/webp')
    
    # 增加浏览器缓存头部 (7天)
    response.headers['Cache-Control'] = 'public, max-age=604800' 
    return response

# ===========================
#  视频服务 (需要单独实现，但这里保持不变)
# ===========================
# 您原代码中没有 /video 路由，但 Nginx 中有，所以这里添加一个占位符。
@app.route('/video/<series_name>/<path:chapter_path_id>/<filename>')
def serve_video(series_name, chapter_path_id, filename):
    
    # 1. 检查 HQ 目录是否存在该文件 (API扫描源)
    directory = safe_join(COMICS_ROOT_DIR, HQ_SUB_DIR, series_name, chapter_path_id)
    file_path = os.path.join(directory, filename)
    
    if os.path.exists(file_path):
        # 文件存在，让 Nginx 处理
        print(f"INFO: Video file exists. Passing control to Nginx: {file_path}")
        # 这里可以直接返回 200 OK，Nginx 已经配置了 rewrite 来处理静态文件
        # 但更标准的做法是让 Flask 返回一个 Nginx 不会缓存的简单响应
        return "", 200 
    else:
        print(f"ERROR: Video file not found: {file_path}")
        return "Video file not found", 404

# ===========================
# 5️⃣ 首页 (保持不变)
# ===========================
@app.route('/')
def index():
    print(f"INFO: Serving index page to {request.remote_addr}")
    # 假设 'index.html' 在与 app.py 同级目录下的 'templates' 文件夹中
    return render_template('index.html')