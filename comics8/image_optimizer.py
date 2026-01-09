import os
import io
from PIL import Image
from typing import IO, Tuple, Union

# 定义支持的图片扩展名
SUPPORTED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')

# 目标 WebP 质量设置
WEBP_QUALITY = 15
# WebP 编码方法（0最快，6最慢但压缩效果最好）
WEBP_METHOD = 4
# 目标 MIME 类型
WEBP_MIMETYPE = 'image/webp'

def optimize_image_to_webp(file_path: str, output_path: str) -> bool:
    """
    加载指定路径的图片，将其转换为低质量 WebP 格式并保存到目标路径。

    Args:
        file_path: 待处理图片的高质量绝对路径。
        output_path: 目标低质量 WebP 文件的绝对路径。

    Returns:
        bool: 如果处理成功，返回 True；否则返回 False。
    """
    if not os.path.exists(file_path):
        print(f"ERROR: Source file not found: {file_path}")
        return False

    lower_filename = file_path.lower()
    if not lower_filename.endswith(SUPPORTED_IMAGE_EXTENSIONS):
        print(f"WARNING: Skipping unsupported format: {os.path.basename(file_path)}")
        return False

    # 确保输出目录存在
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        # 1. 打开图片
        img = Image.open(file_path)
        
        # 2. 保存为低质量 WebP
        # 注意：这里直接保存到文件系统，而不是内存流
        img.save(output_path, format='WEBP', quality=WEBP_QUALITY, method=WEBP_METHOD)
        
        return True

    except Exception as e:
        print(f"ERROR: Image processing failed for {file_path}: {e}")
        return False