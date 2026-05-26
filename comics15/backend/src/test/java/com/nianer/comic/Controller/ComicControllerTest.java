package com.nianer.comic.Controller;

import com.nianer.comic.Component.RedisValidator;
import com.nianer.comic.Config.ComicConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import com.nianer.comic.Service.ComicCacheService;
import com.nianer.comic.Service.ComicCatalogService;
import com.nianer.comic.Service.ComicMediaService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
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
        comicConfig = mock(ComicConfig.class);

        Path hqPath = comicsRoot.resolve("h_photograph");
        Path lqPath = comicsRoot.resolve("l_photograph");
        Files.createDirectories(hqPath);
        Files.createDirectories(lqPath);
        when(comicConfig.getHqPath()).thenReturn(hqPath);
        when(comicConfig.getLqPath()).thenReturn(lqPath);

        ComicCacheService cacheService = new ComicCacheService(mock(StringRedisTemplate.class), new ObjectMapper(), comicConfig);
        ComicMediaService mediaService = new ComicMediaService(comicConfig);
        ComicCatalogService catalogService = new ComicCatalogService(comicConfig, cacheService, mediaService);
        controller = new ComicController(catalogService);
    }

    private void createChapter(String series, String chapterPath, String filename) throws Exception {
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve(series).resolve(chapterPath);
        Files.createDirectories(hqChapter);
        Files.writeString(hqChapter.resolve(filename), "hq");
    }

    private void createSeriesDir(String series) throws Exception {
        Files.createDirectories(comicsRoot.resolve("h_photograph").resolve(series));
    }

    @Test
    void listLevelNodesReturnsDirectDirectoriesAndChapters() throws Exception {
        Path lqChapter = comicsRoot.resolve("l_photograph").resolve("测试系列").resolve("第 2 话");
        Files.createDirectories(lqChapter);
        Files.writeString(lqChapter.resolve("001.webp"), "lq");
        createChapter("测试系列", "第 10 话", "001.jpg");
        createChapter("测试系列", "第 2 话", "001.jpg");
        Files.createDirectories(comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("第一卷").resolve("番外篇"));

        ResponseEntity<Map<String, Object>> response = controller.listLevelNodes("测试系列", "");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("path", "");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) response.getBody().get("nodes");
        assertThat(nodes).hasSize(3);
        Map<String, Object> directoryNode = findNodeByName(nodes, "第一卷");
        Map<String, Object> chapter2Node = findNodeByName(nodes, "第 2 话");
        Map<String, Object> chapter10Node = findNodeByName(nodes, "第 10 话");

        assertThat(directoryNode)
                .containsEntry("type", "directory")
                .containsEntry("path", "第一卷")
                .containsEntry("hasChildren", true)
                .doesNotContainKeys("coverUrl");
        assertThat(chapter2Node)
                .containsEntry("type", "chapter")
                .containsEntry("pathId", "第 2 话")
                .containsEntry("fileCount", 1)
                .containsEntry("coverUrl", "/lq_image/测试系列/第 2 话/001.webp");
        assertThat(chapter10Node)
                .containsEntry("type", "chapter")
                .containsEntry("pathId", "第 10 话")
                .containsEntry("fileCount", 1)
                .containsEntry("coverUrl", "/hq_image/测试系列/第 10 话/001.jpg");
    }

    @Test
    void listLevelNodesDecodesPathAndReturnsCurrentLevelChildren() throws Exception {
        createChapter("测试系列", "第一卷/第 1 话", "001.png");

        ResponseEntity<Map<String, Object>> response = controller.listLevelNodes("测试系列", "%E7%AC%AC%E4%B8%80%E5%8D%B7");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("path", "第一卷");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) response.getBody().get("nodes");
        assertThat(nodes).hasSize(1);
        assertThat(nodes.getFirst())
                .containsEntry("type", "chapter")
                .containsEntry("name", "第 1 话")
                .containsEntry("pathId", "第一卷/第 1 话")
                .containsEntry("fileCount", 1)
                .containsEntry("coverUrl", "/hq_image/测试系列/第一卷/第 1 话/001.png");
    }

    @Test
    void listLevelNodesUsesChapterPreviewWithoutFullMediaList() throws Exception {
        createChapter("测试系列", "第一卷/视频章节", "001.mp4");
        createChapter("测试系列", "第一卷/视频章节", "002.jpg");

        ResponseEntity<Map<String, Object>> response = controller.listLevelNodes("测试系列", "第一卷");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) response.getBody().get("nodes");
        assertThat(nodes).hasSize(1);
        assertThat(nodes.getFirst())
                .containsEntry("type", "chapter")
                .containsEntry("name", "视频章节")
                .containsEntry("pathId", "第一卷/视频章节")
                .containsEntry("fileCount", 2)
                .containsEntry("coverUrl", "/hq_image/测试系列/第一卷/视频章节/002.jpg");
    }


    @Test
    void listChapterFilesReturnsMediaMetadataWithSourceUrls() throws Exception {
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("第一卷").resolve("第 1 话");
        Path lqChapter = comicsRoot.resolve("l_photograph").resolve("测试系列").resolve("第一卷").resolve("第 1 话");
        Files.createDirectories(hqChapter);
        Files.createDirectories(lqChapter);
        Files.writeString(hqChapter.resolve("002.mp4"), "video");
        Files.writeString(hqChapter.resolve("001.jpg"), "hq-image");
        Files.writeString(lqChapter.resolve("001.webp"), "lq");

        ResponseEntity<Map<String, Object>> response = controller.listChapterFiles("测试系列", "第一卷/第 1 话");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody())
                .containsEntry("path", "第一卷/第 1 话")
                .containsEntry("total", 2);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> files = (List<Map<String, Object>>) response.getBody().get("files");
        assertThat(files).hasSize(2);

        Map<String, Object> imageMeta = files.getFirst();
        assertThat(imageMeta)
                .containsEntry("name", "001.jpg")
                .containsEntry("type", "image")
                .containsEntry("url", "/lq_image/测试系列/第一卷/第 1 话/001.webp")
                .containsEntry("fallbackUrl", "/hq_image/测试系列/第一卷/第 1 话/001.jpg");

        Map<String, Object> videoMeta = files.get(1);
        assertThat(videoMeta)
                .containsEntry("name", "002.mp4")
                .containsEntry("type", "video")
                .containsEntry("url", "/video/测试系列/第一卷/第 1 话/002.mp4")
                .containsEntry("fallbackUrl", null);
    }

    @Test
    void listLevelNodesReturnsBadRequestForPathTraversalAttempt() throws Exception {
        ResponseEntity<Map<String, Object>> response = controller.listLevelNodes("测试系列", "..");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("path", "..");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) response.getBody().get("nodes");
        assertThat(nodes).isEmpty();
    }

    @Test
    void listChapterFilesReturnsNotFoundWhenChapterDirectoryMissing() throws Exception {
        ResponseEntity<Map<String, Object>> response = controller.listChapterFiles("测试系列", "缺失章节");

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody())
                .containsEntry("path", "缺失章节")
                .containsEntry("total", 0);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> files = (List<Map<String, Object>>) response.getBody().get("files");
        assertThat(files).isEmpty();
    }

    private Map<String, Object> findNodeByName(List<Map<String, Object>> nodes, String name) {
        return nodes.stream()
                .filter(node -> name.equals(node.get("name")))
                .findFirst()
                .orElseThrow();
    }

}
