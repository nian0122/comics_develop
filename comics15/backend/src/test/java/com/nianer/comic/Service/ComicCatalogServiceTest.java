package com.nianer.comic.Service;

import com.nianer.comic.Component.RedisValidator;
import com.nianer.comic.Config.ComicConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

class ComicCatalogServiceTest {

    private ComicCatalogService catalogService;
    private ComicConfig comicConfig;

    @TempDir
    private Path comicsRoot;

    @BeforeEach
    void setUp() throws Exception {
        RedisValidator.REDIS_ENABLED = false;
        comicConfig = mock(ComicConfig.class);
        Path hqPath = comicsRoot.resolve("h_photograph");
        Path lqPath = comicsRoot.resolve("l_photograph");
        Files.createDirectories(hqPath);
        Files.createDirectories(lqPath);
        when(comicConfig.getHqPath()).thenReturn(hqPath);
        when(comicConfig.getLqPath()).thenReturn(lqPath);
        when(comicConfig.getCacheExpiration()).thenReturn(604800L);

        ComicCacheService cacheService = new ComicCacheService(mock(StringRedisTemplate.class), new ObjectMapper(), comicConfig);
        ComicMediaService mediaService = new ComicMediaService(comicConfig);
        catalogService = new ComicCatalogService(comicConfig, cacheService, mediaService);
    }

    @Test
    void getChapterFilesReturnsNotFoundBodyWhenChapterDirectoryMissing() throws Exception {
        ComicCatalogService.ChapterFilesResult result = catalogService.getChapterFiles("测试系列", "缺失章节");

        assertThat(result.found()).isFalse();
        assertThat(result.body())
                .containsEntry("path", "缺失章节")
                .containsEntry("total", 0);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> files = (List<Map<String, Object>>) result.body().get("files");
        assertThat(files).isEmpty();
    }

    @Test
    void getChapterFilesCachesCompleteResponseBody() throws Exception {
        RedisValidator.REDIS_ENABLED = true;
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        AtomicReference<String> cachedValue = new AtomicReference<>();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenAnswer(invocation -> cachedValue.get());
        doAnswer(invocation -> {
            cachedValue.set(invocation.getArgument(1));
            return null;
        }).when(valueOperations).set(anyString(), anyString(), anyLong(), any(TimeUnit.class));

        ComicCacheService cacheService = new ComicCacheService(redisTemplate, new ObjectMapper(), comicConfig);
        ComicMediaService mediaService = new ComicMediaService(comicConfig);
        ComicCatalogService redisCatalogService = new ComicCatalogService(comicConfig, cacheService, mediaService);
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("第 1 话");
        Files.createDirectories(hqChapter);
        Files.writeString(hqChapter.resolve("001.jpg"), "hq");

        ComicCatalogService.ChapterFilesResult firstResult = redisCatalogService.getChapterFiles("测试系列", "第 1 话");
        Path lqChapter = comicsRoot.resolve("l_photograph").resolve("测试系列").resolve("第 1 话");
        Files.createDirectories(lqChapter);
        Files.writeString(lqChapter.resolve("001.webp"), "lq");
        ComicCatalogService.ChapterFilesResult cachedResult = redisCatalogService.getChapterFiles("测试系列", "第 1 话");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> files = (List<Map<String, Object>>) cachedResult.body().get("files");
        assertThat(files.getFirst())
                .containsEntry("type", "image")
                .containsEntry("url", "/hq_image/测试系列/第 1 话/001.jpg")
                .containsEntry("fallbackUrl", null);
    }
}
