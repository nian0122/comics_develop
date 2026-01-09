from PIL import Image
import os
import multiprocessing
import functools
import time

# --- 辅助函数：处理单个图片 ---
def process_single_image(input_path, output_dir, angle):
    """
    处理单个图片的旋转和保存逻辑。
    
    参数:
    input_path (str): 原始图片路径。
    output_dir (str): 输出文件夹路径。
    angle (int): 旋转角度 (90, 180, 或 270)。
    """
    filename = os.path.basename(input_path)
    output_path = os.path.join(output_dir, filename)

    try:
        # 1. 打开图片
        img = Image.open(input_path)
        
        # 2. 旋转
        # 注意：Pillow的 rotate() 方法默认是逆时针旋转。
        # 如果你想要顺时针旋转，需要使用 360 - angle
        # 比如：顺时针90度 = 逆时针270度
        
        # 为了方便用户理解，我们统一使用顺时针角度：
        if angle == 90:
            rotated_img = img.transpose(Image.ROTATE_90)
        elif angle == 180:
            rotated_img = img.transpose(Image.ROTATE_180)
        elif angle == 270:
            rotated_img = img.transpose(Image.ROTATE_270)
        else:
            # 如果提供了不支持的角度，则跳过
            print(f"⚠️ 跳过文件: {filename}。提供了不支持的旋转角度: {angle}")
            return 0
        
        # 3. 保存
        # 可以对JPEG文件使用 quality=90 来平衡速度和质量
        rotated_img.save(output_path)
        
        # 释放资源
        img.close()
        rotated_img.close()
        return 1 # 返回成功计数
        
    except IOError:
        print(f"⚠️ 跳过文件: {filename} (不是有效的图片文件或无法处理)")
        return 0
    except Exception as e:
        print(f"❌ 处理文件 {filename} 时发生未知错误: {e}")
        return 0


# --- 主批量处理函数 (使用多进程) ---
def rotate_folder_images_parallel(input_dir, output_dir, rotate_angle):
    """
    批量处理输入文件夹内的所有图片，并将其旋转指定的角度（顺时针）。
    """
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    if rotate_angle not in [90, 180, 270]:
        print(f"❌ 错误：不支持的旋转角度 {rotate_angle}。请选择 90, 180 或 270。")
        return

    # 1. 收集待处理文件列表
    input_files = []
    try:
        for filename in os.listdir(input_dir):
            input_path = os.path.join(input_dir, filename)
            if not os.path.isdir(input_path): # 只处理文件
                input_files.append(input_path)
    except FileNotFoundError:
        print(f"❌ 错误：找不到输入文件夹 {input_dir}。请检查路径是否正确。")
        return
        
    total_files = len(input_files)

    print(f"--- 🚀 开始批量旋转图片 (顺时针 {rotate_angle} 度, 使用 {multiprocessing.cpu_count()} 个进程) ---")
    print(f"📁 输入目录: {input_dir}")
    print(f"📁 输出目录: {output_dir}")
    print(f"🖼️ 待处理图片总数: {total_files}")
    print("-" * 40)

    start_time = time.time()
    processed_count = 0

    try:
        # 2. 创建 Pool 对象，使用 CPU 核心数作为进程数
        with multiprocessing.Pool(multiprocessing.cpu_count()) as pool:
            
            # 使用 functools.partial 预设不变的参数 (output_dir, rotate_angle)
            worker_func = functools.partial(
                process_single_image,
                output_dir=output_dir,
                angle=rotate_angle
            )
            
            # 3. 映射任务到进程池并执行
            results = pool.map(worker_func, input_files)
            
            # 4. 统计处理成功的数量
            processed_count = sum(results)

    except Exception as e:
        print(f"❌ 批量处理过程中发生未知错误: {e}")
    
    end_time = time.time()
    
    print("-" * 40)
    print(f"🎉 批量处理完成！")
    print(f"   - 总耗时: {end_time - start_time:.2f} 秒")
    print(f"   - 共旋转图片: {processed_count} 张 (跳过 {total_files - processed_count} 张)")


# --- 示例用法 (请确保这些文件夹存在) ---
input_folder = r"F:\games\comics\in"   # 包含所有待旋转图片
output_folder = r"F:\games\comics\out" # 旋转后保存的目录

# *** VITAL: 在这里修改你需要的角度 (90, 180, 或 270) ***
# -----------------------------------------------------------
rotate_angle = 90 
# -----------------------------------------------------------
# 90逆时针

# 4. 执行旋转功能
if __name__ == '__main__':
    # 在 Windows 系统上，使用 multiprocessing 必须把启动代码放在 if __name__ == '__main__': 块内
    rotate_folder_images_parallel(input_folder, output_folder, rotate_angle)