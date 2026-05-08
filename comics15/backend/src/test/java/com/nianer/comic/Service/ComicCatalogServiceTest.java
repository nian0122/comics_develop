package com.nianer.comic.Service;

import com.nianer.comic.Component.RedisValidator;
import com.nianer.comic.Config.ComicConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ComicCatalogServiceTest {

    private ComicCatalogService catalogService;

    @TempDir
    private Path comicsRoot;

    @BeforeEach
    void setUp() throws Exception {
        RedisValidator.REDIS_ENABLED = false;
        ComicConfig comicConfig = mock(ComicConfig.class);
        Path hqPath = comicsRoot.resolve("h_photograph");
        Path lqPath = comicsRoot.resolve("l_photograph");
        Files.createDirectories(hqPath);
        Files.createDirectories(lqPath);
        when(comicConfig.getHqPath()).thenReturn(hqPath);
        when(comicConfig.getLqPath()).thenReturn(lqPath);

        ComicCacheService cacheService = new ComicCacheService(mock(StringRedisTemplate.class), new ObjectMapper(), comicConfig);
        ComicMediaService mediaService = new ComicMediaService(comicConfig);
        catalogService = new ComicCatalogService(comicConfig, cacheService, mediaService);
    }

    @Test
    void listSeriesScansHqDirectoriesWithNaturalOrderWhenCacheDisabled() throws Exception {
        Files.createDirectories(comicsRoot.resolve("h_photograph").resolve("Series 10"));
        Files.createDirectories(comicsRoot.resolve("h_photograph").resolve("Series 2"));
        Files.createDirectories(comicsRoot.resolve("h_photograph").resolve("Series 1"));
        Files.writeString(comicsRoot.resolve("h_photograph").resolve("not-a-series.txt"), "ignore");

        List<String> series = catalogService.listSeries();

        assertThat(series).containsExactly("Series 1", "Series 2", "Series 10");
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
}
