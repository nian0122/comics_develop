package com.nianer.comic.Controller;

import com.nianer.comic.Component.RedisValidator;
import com.nianer.comic.Config.ComicConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
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
    void listChaptersReturnsNoCoverMetadataForVideoOnlyChapter() throws Exception {
        Path hqChapter = comicsRoot.resolve("h_photograph").resolve("测试系列").resolve("PV");
        Files.createDirectories(hqChapter);
        Files.writeString(hqChapter.resolve("001.mp4"), "video");
        Files.writeString(hqChapter.resolve("002.gif"), "gif");

        List<Map<String, String>> chapters = controller.listChapters("测试系列");

        assertThat(chapters).hasSize(1);
        assertThat(chapters.getFirst())
                .containsEntry("path_id", "PV")
                .containsEntry("total_files", "2")
                .doesNotContainKeys("cover_file", "cover_source");
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
                .containsEntry("has_children", true)
                .doesNotContainKeys("cover_file", "cover_source");
        assertThat(chapter2Node)
                .containsEntry("type", "chapter")
                .containsEntry("path_id", "第 2 话")
                .containsEntry("total_files", 1)
                .containsEntry("cover_file", "001.jpg")
                .containsEntry("cover_source", "lq");
        assertThat(chapter10Node)
                .containsEntry("type", "chapter")
                .containsEntry("path_id", "第 10 话")
                .containsEntry("total_files", 1)
                .containsEntry("cover_source", "hq");
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
                .containsEntry("path_id", "第一卷/第 1 话")
                .containsEntry("total_files", 1)
                .containsEntry("cover_file", "001.png")
                .containsEntry("cover_source", "hq");
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
                .containsEntry("baseName", "001")
                .containsEntry("mediaType", "image")
                .containsEntry("preferredSource", "lq")
                .doesNotContainKey("videoUrl");
        @SuppressWarnings("unchecked")
        Map<String, Object> imageHq = (Map<String, Object>) imageMeta.get("hq");
        @SuppressWarnings("unchecked")
        Map<String, Object> imageLq = (Map<String, Object>) imageMeta.get("lq");
        assertThat(imageHq)
                .containsEntry("exists", true)
                .containsEntry("size", 8L)
                .containsEntry("url", "/hq_image/测试系列/第一卷/第 1 话/001.jpg");
        assertThat(imageLq)
                .containsEntry("exists", true)
                .containsEntry("url", "/lq_image/测试系列/第一卷/第 1 话/001.webp");

        Map<String, Object> videoMeta = files.get(1);
        assertThat(videoMeta)
                .containsEntry("name", "002.mp4")
                .containsEntry("baseName", "002")
                .containsEntry("mediaType", "video")
                .containsEntry("preferredSource", "hq")
                .containsEntry("videoUrl", "/video/测试系列/第一卷/第 1 话/002.mp4");
        @SuppressWarnings("unchecked")
        Map<String, Object> videoHq = (Map<String, Object>) videoMeta.get("hq");
        @SuppressWarnings("unchecked")
        Map<String, Object> videoLq = (Map<String, Object>) videoMeta.get("lq");
        assertThat(videoHq)
                .containsEntry("exists", true)
                .containsEntry("size", 5L)
                .containsEntry("url", "/hq_image/测试系列/第一卷/第 1 话/002.mp4");
        assertThat(videoLq)
                .containsEntry("exists", false)
                .containsEntry("url", "/lq_image/测试系列/第一卷/第 1 话/002.webp");
    }

    private Map<String, Object> findNodeByName(List<Map<String, Object>> nodes, String name) {
        return nodes.stream()
                .filter(node -> name.equals(node.get("name")))
                .findFirst()
                .orElseThrow();
    }

    private void createChapter(String seriesName, String chapterPath, String filename) throws Exception {
        Path chapter = comicsRoot.resolve("h_photograph").resolve(seriesName).resolve(chapterPath);
        Files.createDirectories(chapter);
        Files.writeString(chapter.resolve(filename), "hq");
    }
}
