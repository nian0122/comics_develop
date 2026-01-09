import os
import time
from image_optimizer import optimize_image_to_webp # 导入核心处理函数

# ===========================
# 核心配置
# ===========================
# 高质量图片基目录
HIGH_QUALITY_BASE_DIR = r"F:\games\comic\h_photograph"
# 低质量图片基目录 (目标目录)
LOW_QUALITY_BASE_DIR = r"F:\games\comic\l_photograph"
# 目标低质量文件使用的扩展名
LOW_QUALITY_EXTENSION = '.webp'

# 定义支持的图片扩展名 (与 image_optimizer.py 保持一致)
SUPPORTED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')

def run_batch_optimization():
    """
    扫描高质量目录，对比低质量目录，并处理新增/更新的图片。
    """
    print(f"--- 批量图片优化任务启动 ---")
    print(f"  源目录 (HQ): {HIGH_QUALITY_BASE_DIR}")
    print(f"  目标目录 (LQ): {LOW_QUALITY_BASE_DIR}")
    print("-" * 30)

    start_time = time.time()
    processed_count = 0
    skipped_count = 0
    error_count = 0

    if not os.path.isdir(HIGH_QUALITY_BASE_DIR):
        print(f"FATAL: Source directory not found: {HIGH_QUALITY_BASE_DIR}")
        return

    # 递归遍历高质量目录下的所有文件
    for root, _, files in os.walk(HIGH_QUALITY_BASE_DIR):
        # 构造当前路径相对于 BASE_DIR 的相对路径
        relative_path = os.path.relpath(root, HIGH_QUALITY_BASE_DIR)
        
        for filename in files:
            if not filename.lower().endswith(SUPPORTED_IMAGE_EXTENSIONS):
                continue
            
            # 1. 构造高质量文件的完整路径
            high_quality_path = os.path.join(root, filename)

            # 2. 构造低质量目标文件的完整路径
            # a. 移除原始扩展名
            base_filename, _ = os.path.splitext(filename)
            # b. 构造低质量文件名 (使用 .webp 扩展名)
            low_quality_filename = base_filename + LOW_QUALITY_EXTENSION
            
            # c. 构造目标路径
            low_quality_dir = os.path.join(LOW_QUALITY_BASE_DIR, relative_path)
            low_quality_path = os.path.join(low_quality_dir, low_quality_filename)

            # 3. 检查是否需要处理 (文件时间戳和存在性检查)
            try:
                hq_modified_time = os.path.getmtime(high_quality_path)
                
                if os.path.exists(low_quality_path):
                    lq_modified_time = os.path.getmtime(low_quality_path)
                    
                    # 如果低质量文件比高质量文件新或一样新，则跳过
                    if lq_modified_time >= hq_modified_time:
                        skipped_count += 1
                        # print(f"SKIP: {os.path.join(relative_path, filename)}")
                        continue
            except OSError as e:
                # 处理文件时间戳获取失败的情况
                print(f"WARNING: Could not get modification time for {high_quality_path}. Processing anyway. Error: {e}")
            
            # 4. 执行图片处理
            print(f"PROCESS: {os.path.join(relative_path, filename)}")
            
            if optimize_image_to_webp(high_quality_path, low_quality_path):
                processed_count += 1
            else:
                error_count += 1

    end_time = time.time()
    
    print("-" * 30)
    print("--- 批量图片优化任务完成 ---")
    print(f"总耗时: {end_time - start_time:.2f} 秒")
    print(f"处理图片数量: {processed_count}")
    print(f"跳过图片数量: {skipped_count}")
    print(f"处理失败数量: {error_count}")
    print("-" * 30)


if __name__ == '__main__':
    run_batch_optimization()