# 第一阶段：构建阶段 (Build Stage)
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# 1. 仅复制 pom.xml 以利用 Docker 层缓存机制下载依赖
# 只要 pom.xml 不变，这一层就不会重新执行
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 2. 复制源码并编译
COPY src ./src
RUN mvn clean package -DskipTests

# 第二阶段：运行阶段 (Runtime Stage)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 设置环境变量默认值（对应 application.yaml 中的配置）
ENV COMICS_ROOT_DIR=/comics \
    HQ_SUB_DIR=h_photograph \
    LQ_SUB_DIR=l_photograph \
    REDIS_HOST=redis \
    REDIS_PORT=6379

# 从构建阶段拷贝编译好的 jar 包
COPY --from=build /app/target/*.jar app.jar

EXPOSE 500

# 启动命令
# 使用随机数增强安全性，并限制内存占用
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]