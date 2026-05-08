package com.nianer.comic.Service;

import com.nianer.comic.Config.ComicConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.io.IOException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static com.nianer.comic.Component.RedisValidator.REDIS_ENABLED;

@Slf4j
@Service
public class ComicCacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ComicConfig config;

    public ComicCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, ComicConfig config) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.config = config;
    }

    public <T> Optional<T> get(String cacheKey, TypeReference<T> typeReference, String logPrefix) throws IOException {
        if (!REDIS_ENABLED) {
            return Optional.empty();
        }

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached == null) {
            log.info("{} 缓存未命中: {}", logPrefix, cacheKey);
            return Optional.empty();
        }

        log.info("{} 缓存命中: {}", logPrefix, cacheKey);
        return Optional.of(objectMapper.readValue(cached, typeReference));
    }

    public void put(String cacheKey, Object value) throws IOException {
        if (!REDIS_ENABLED) {
            return;
        }

        redisTemplate.opsForValue().set(
                cacheKey,
                objectMapper.writeValueAsString(value),
                config.getCacheExpiration(),
                TimeUnit.SECONDS
        );
    }
}
