package com.nianer.comic.Controller;

import com.nianer.comic.Component.RedisValidator;
import com.nianer.comic.Config.ComicConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ComicControllerTest {

    private ComicController controller;
    private ComicConfig comicConfig;

    @TempDir
    private Path comicsRoot;

    @BeforeEach
    void setUp() throws Exception {
        RedisValidator.REDIS_ENABLED = false;
        controller = new ComicController();
        comicConfig = mock(ComicConfig.class);
        ReflectionTestUtils.setField(controller, "config", comicConfig);
        ReflectionTestUtils.setField(controller, "redisTemplate", mock(StringRedisTemplate.class));
        ReflectionTestUtils.setField(controller, "objectMapper", mock(ObjectMapper.class));

        Path hqPath = comicsRoot.resolve("h_photograph");
        Path lqPath = comicsRoot.resolve("l_photograph");
        Files.createDirectories(hqPath);
        Files.createDirectories(lqPath);
        when(comicConfig.getHqPath()).thenReturn(hqPath);
        when(comicConfig.getLqPath()).thenReturn(lqPath);
    }

    @Test
    void listChaptersReturnsCoverMetadataFromChapterFiles() throws Exception {
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("第一卷").resolve("第 1 话");
        Path lqChapter = comicsRoot.resolve("l_photograph").resolve("测试系列").resolve("第一卷").resolve("第 1 话");
        Files.createDirectories(hqChapter);
        Files.createDirectories(lqChapter);
        Files.writeString(hqChapter.resolve("002.jpg"), "hq");
        Files.writeString(hqChapter.resolve("001.jpg"), "hq");
        Files.writeString(hqChapter.resolve("clip.mp4"), "video");
        Files.writeString(lqChapter.resolve("001.webp"), "lq");

        List<Map<String, String>> chapters = controller.listChapters("测试系列");

        assertThat(chapters).hasSize(1);
        assertThat(chapters.getFirst())
                .containsEntry("path_id", "第一卷/第 1 话")
                .containsEntry("name", "第 1 话")
                .containsEntry("cover_file", "001.jpg")
                .containsEntry("cover_source", "lq")
                .containsEntry("total_files", "3");
    }

    @Test
    void listChaptersFallsBackToHqCoverSourceWhenLqMissing() throws Exception {
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("第 2 话");
        Files.createDirectories(hqChapter);
        Files.writeString(hqChapter.resolve("001.png"), "hq");

        List<Map<String, String>> chapters = controller.listChapters("测试系列");

        assertThat(chapters).hasSize(1);
        assertThat(chapters.getFirst())
                .containsEntry("cover_file", "001.png")
                .containsEntry("cover_source", "hq")
                .containsEntry("total_files", "1");
    }

    @Test
    void listChaptersPreservesNaturalOrderWhenScanningNestedDirectories() throws Exception {
        createChapter("测试系列", "Volume 1/Chapter 10", "001.jpg");
        createChapter("测试系列", "Volume 1/Chapter 2", "001.jpg");
        createChapter("测试系列", "Volume 1/Chapter 1", "001.jpg");
        createChapter("测试系列", "Volume 2/Chapter 1", "001.jpg");

        List<Map<String, String>> chapters = controller.listChapters("测试系列");

        assertThat(chapters).extracting(chapter -> chapter.get("path_id"))
                .containsExactly("Volume 1/Chapter 1", "Volume 1/Chapter 2", "Volume 1/Chapter 10", "Volume 2/Chapter 1");
    }

    private void createChapter(String seriesName, String chapterPath, String filename) throws Exception {
        Path chapter = comicsRoot.resolve("h_photograph").resolve(seriesName).resolve(chapterPath);
        Files.createDirectories(chapter);
        Files.writeString(chapter.resolve(filename), "hq");
    }
}
