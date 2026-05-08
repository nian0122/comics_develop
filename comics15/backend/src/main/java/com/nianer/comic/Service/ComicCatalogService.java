package com.nianer.comic.Service;

import com.nianer.comic.Config.ComicConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
public class ComicCatalogService {

    private final ComicConfig config;
    private final ComicCacheService cacheService;
    private final ComicMediaService mediaService;

    public ComicCatalogService(ComicConfig config, ComicCacheService cacheService, ComicMediaService mediaService) {
        this.config = config;
        this.cacheService = cacheService;
        this.mediaService = mediaService;
    }

    public List<String> listSeries() throws IOException {
        String cacheKey = "series_list";
        Optional<List<String>> cached = cacheService.get(cacheKey, new TypeReference<List<String>>() {
        }, "[Series]");
        if (cached.isPresent()) {
            return cached.get();
        }

        Path hqPath = config.getHqPath();
        log.info("开始扫描物理路径: {}", hqPath.toAbsolutePath());
        if (!Files.exists(hqPath)) {
            log.warn("警告：路径不存在 -> {}", hqPath.toAbsolutePath());
            return Collections.emptyList();
        }

        List<String> series;
        try (Stream<Path> stream = Files.list(hqPath)) {
            series = stream
                    .filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .sorted(mediaService::naturalCompare)
                    .collect(Collectors.toList());
        }
        log.info("成功扫描到 {} 个漫画系列", series.size());

        cacheService.put(cacheKey, series);
        return series;
    }

    public List<Map<String, String>> listChapters(String seriesName) throws IOException {
        log.info("[Chapters] 请求获取系列章节: {}", seriesName);
        String cacheKey = "chapters_list:" + seriesName;
        Optional<List<Map<String, String>>> cached = cacheService.get(cacheKey, new TypeReference<List<Map<String, String>>>() {
        }, "[Chapters]");
        if (cached.isPresent()) {
            return cached.get();
        }

        Path seriesPath = config.getHqPath().resolve(seriesName);
        if (!Files.exists(seriesPath)) {
            log.warn("[Chapters] 路径不存在: {}", seriesPath.toAbsolutePath());
            return Collections.emptyList();
        }

        List<Map<String, String>> chaptersData = findChaptersRecursive(seriesPath, "", seriesName);
        log.info("[Chapters] 递归扫描完成: {}, 找到章节数: {}", seriesName, chaptersData.size());

        cacheService.put(cacheKey, chaptersData);
        return chaptersData;
    }

    public ChapterFilesResult getChapterFiles(String seriesName, String chapterPath) throws IOException {
        String normalizedChapterPath = chapterPath == null ? "" : chapterPath;
        log.info("[Files] 获取文件列表 - 系列: {}, 章节路径: {}", seriesName, normalizedChapterPath);

        String cacheKey = "chapter_files:" + seriesName + ":" + normalizedChapterPath;
        Path chapterPathResolved = config.getHqPath().resolve(seriesName).resolve(normalizedChapterPath);
        if (!Files.exists(chapterPathResolved) || !Files.isDirectory(chapterPathResolved)) {
            log.warn("[Files] 目录不存在: {}", chapterPathResolved.toAbsolutePath());
            return new ChapterFilesResult(HttpStatus.NOT_FOUND, mediaService.buildChapterFilesResponse(normalizedChapterPath, Collections.emptyList()));
        }

        Optional<List<String>> cached = cacheService.get(cacheKey, new TypeReference<List<String>>() {
        }, "[Files]");
        if (cached.isPresent()) {
            return new ChapterFilesResult(HttpStatus.OK, mediaService.buildChapterFilesResponse(seriesName, normalizedChapterPath, chapterPathResolved, cached.get()));
        }

        List<String> files = mediaService.listSupportedMediaFiles(chapterPathResolved);
        log.info("[Files] 扫描到文件数: {}", files.size());
        cacheService.put(cacheKey, files);

        return new ChapterFilesResult(HttpStatus.OK, mediaService.buildChapterFilesResponse(seriesName, normalizedChapterPath, chapterPathResolved, files));
    }

    public LevelNodesResult listLevelNodes(String seriesName, String decodedPath) throws IOException {
        log.info("[Levels] 请求层级节点 - 系列: {}, 路径: {}", seriesName, decodedPath);

        String cacheKey = "v2:level:" + seriesName + ":" + decodedPath;
        Optional<Map<String, Object>> cached = cacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {
        }, "[Levels]");
        if (cached.isPresent()) {
            return new LevelNodesResult(HttpStatus.OK, cached.get());
        }

        Path seriesPath = config.getHqPath().resolve(seriesName).normalize();
        Path targetPath = decodedPath.isEmpty() ? seriesPath : seriesPath.resolve(decodedPath).normalize();
        if (!targetPath.startsWith(seriesPath)) {
            log.warn("[Levels] 非法路径访问 - 系列: {}, 路径: {}", seriesName, decodedPath);
            return new LevelNodesResult(HttpStatus.BAD_REQUEST, mediaService.buildLevelResponse(decodedPath, Collections.emptyList()));
        }
        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
            log.warn("[Levels] 目录不存在: {}", targetPath.toAbsolutePath());
            return new LevelNodesResult(HttpStatus.NOT_FOUND, mediaService.buildLevelResponse(decodedPath, Collections.emptyList()));
        }

        List<Map<String, Object>> nodes = scanLevelNodes(targetPath, decodedPath, seriesName);
        Map<String, Object> response = mediaService.buildLevelResponse(decodedPath, nodes);
        log.info("[Levels] 扫描完成 - 系列: {}, 路径: {}, 节点数: {}", seriesName, decodedPath, nodes.size());
        cacheService.put(cacheKey, response);

        return new LevelNodesResult(HttpStatus.OK, response);
    }

    private List<Map<String, Object>> scanLevelNodes(Path targetPath, String currentRel, String seriesName) throws IOException {
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Path> entries = mediaService.listSortedSubDirectories(targetPath);

        for (Path entry : entries) {
            String name = entry.getFileName().toString();
            String entryRel = currentRel.isEmpty() ? name : currentRel + "/" + name;
            List<String> mediaFiles = mediaService.listSupportedMediaFiles(entry);
            if (mediaFiles.isEmpty()) {
                nodes.add(mediaService.buildDirectoryNode(entry, name, entryRel));
            } else {
                nodes.add(mediaService.buildLevelChapterNode(seriesName, name, entryRel, mediaFiles));
            }
        }
        return nodes;
    }

    private List<Map<String, String>> findChaptersRecursive(Path root, String currentRel, String seriesName) throws IOException {
        Path fullPath = root.resolve(currentRel);
        List<String> mediaFiles = mediaService.listSupportedMediaFiles(fullPath);

        if (!mediaFiles.isEmpty()) {
            return List.of(mediaService.buildChapterData(seriesName, currentRel, mediaFiles));
        }

        List<Path> subDirs = mediaService.listSortedSubDirectories(fullPath);
        if (subDirs.isEmpty()) {
            return Collections.emptyList();
        }

        try (ExecutorService scanExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<List<Map<String, String>>>> futures = subDirs.stream()
                    .map(dir -> CompletableFuture.supplyAsync(() -> scanSubDirectory(root, currentRel, dir, seriesName), scanExecutor))
                    .collect(Collectors.toList());

            List<Map<String, String>> result = new ArrayList<>();
            for (CompletableFuture<List<Map<String, String>>> future : futures) {
                result.addAll(joinScanResult(future));
            }
            return result;
        }
    }

    private List<Map<String, String>> scanSubDirectory(Path root, String currentRel, Path dir, String seriesName) {
        try {
            String childRel = currentRel.isEmpty()
                    ? dir.getFileName().toString()
                    : currentRel + "/" + dir.getFileName().toString();
            return findChaptersRecursive(root, childRel, seriesName);
        } catch (IOException e) {
            throw new CompletionException(e);
        }
    }

    private List<Map<String, String>> joinScanResult(CompletableFuture<List<Map<String, String>>> future) throws IOException {
        try {
            return future.join();
        } catch (CompletionException e) {
            if (e.getCause() instanceof IOException ioException) {
                throw ioException;
            }
            throw e;
        }
    }

    public record ChapterFilesResult(HttpStatus status, Map<String, Object> body) {
        public boolean found() {
            return status == HttpStatus.OK;
        }
    }

    public record LevelNodesResult(HttpStatus status, Map<String, Object> body) {
    }
}
