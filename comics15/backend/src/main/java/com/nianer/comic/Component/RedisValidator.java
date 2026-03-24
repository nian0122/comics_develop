package com.nianer.comic.Component;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Redis 连接校验组件
 * 用于项目启动时检测 Redis 服务可用性，并决定是否开启缓存降级策略
 */
@Component
@Schema(description = "Redis 连接校验组件，管理全局缓存开关状态")
public class RedisValidator {
    private static final Logger logger = LoggerFactory.getLogger(RedisValidator.class);

    private final StringRedisTemplate redisTemplate;

    /**
     * 全局静态开关
     * true: Redis 可用，使用 Redis 缓存
     * false: Redis 不可用，直接扫描文件系统
     */
    @Schema(description = "全局 Redis 启用状态开关", example = "true")
    public static boolean REDIS_ENABLED = false;

    public RedisValidator(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 项目启动后执行 PING 测试
     */
    @PostConstruct
    public void validateRedisConnection() {
        try {
            // 使用 execute 直接操作底层连接执行 PING 指令
            String result = redisTemplate.execute((RedisConnection connection) ->
                    new String(Objects.requireNonNull(connection.ping())));

            if ("PONG".equalsIgnoreCase(result)) {
                REDIS_ENABLED = true;
                logger.info("Redis 连接成功，缓存功能已启用。");
            }
        } catch (Exception e) {
            REDIS_ENABLED = false;
            logger.error("Redis 连接失败: {}。系统将降级使用本地文件系统扫描。", e.getMessage());
        }
    }
}