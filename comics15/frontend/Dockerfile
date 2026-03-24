# 第一阶段：构建阶段
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build

# 第二阶段：运行阶段
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist .

EXPOSE 80