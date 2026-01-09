# 使用官方 Python 基础镜像
FROM python:3.12-slim 

# 设置容器的工作目录
WORKDIR /app

# 复制依赖文件并安装依赖
# 注意：这步应该在复制 app.py 之前，以利用 Docker 缓存层
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制整个应用程序代码到容器
COPY app.py .
COPY templates/index.html ./templates/
# 假设你的 index.html 在 templates 目录下

# 暴露 Flask 默认使用的端口 500
EXPOSE 500

# 容器启动时运行 Flask 应用
# 由于使用 Docker Compose 覆盖了 HOST 和 PORT，这里可以保持简单
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:500", "app:app"]