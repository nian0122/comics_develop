import os

def replace_files_with_empty_recursive(root_dir, extensions=['.jpg', '.jpeg', '.png', '.gif', '.bmp']):
    """
    递归遍历根目录下及其所有子目录内的文件。
    删除所有匹配扩展名的文件内容，但保留其文件名，
    将其替换为同名的 0 字节空文件。

    :param root_dir: 要开始遍历的根文件夹的路径。
    :param extensions: 要处理的文件扩展名列表（小写）。
    """
    print(f"--- 正在开始递归处理根目录: {root_dir} ---")
    
    # 确保扩展名列表是小写的，方便匹配
    lower_extensions = [ext.lower() for ext in extensions]
    count = 0
    
    # os.walk(root_dir) 会生成三元组 (dirpath, dirnames, filenames)
    for dirpath, dirnames, filenames in os.walk(root_dir):
        
        # 遍历当前目录下的所有文件
        for filename in filenames:
            file_extension = os.path.splitext(filename)[1].lower() # 获取文件扩展名并转小写
            
            # 检查文件扩展名是否在目标列表中
            if file_extension in lower_extensions:
                file_path = os.path.join(dirpath, filename)
                
                try:
                    # 1. 删除原始文件（内容被删除）
                    os.remove(file_path)
                    
                    # 2. 创建一个同名的新空文件（文件内容为空）
                    # 'w' 模式打开文件，如果文件不存在则创建，如果存在则清空内容
                    with open(file_path, 'w') as f:
                        pass  # 什么都不写入，文件大小为 0 字节
                    
                    # print(f"✅ 成功替换文件: {file_path}") # 路径可能很长，可以只打印文件名
                    print(f"✅ 成功替换: {filename} (在 {dirpath})")
                    count += 1
                    
                except Exception as e:
                    print(f"❌ 处理文件 {file_path} 时出错: {e}")

    print(f"\n--- 递归处理完成。共替换了 {count} 个文件。---")

# --- 配置您的根文件夹路径 ---
# !! 请修改为您的目标根文件夹路径 !!
#target_root_directory = r"F:\games\comics\h_photograph\林_希_威\NO.009 爱可(欣欣)（部分水印） [7套-30.31 GB]" # 使用 r"" 可以防止路径中的反斜杠问题

# --- 运行函数 ---
if os.path.isdir(target_root_directory):
    replace_files_with_empty_recursive(target_root_directory)
else:
    print(f"错误：路径 {target_root_directory} 不存在或不是一个文件夹。请检查路径是否正确。")