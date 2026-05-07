package com.nianer.comic.Controller;

import com.nianer.comic.Config.ComicConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import net.greypanther.natsort.CaseInsensitiveSimpleNaturalComparator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.nianer.comic.Component.RedisValidator.REDIS_ENABLED;

@Slf4j
@RestController
@RequestMapping("/")
@Tag(name = "漫画管理接口", description = "负责漫画系列扫描、章节目录索引")
public class ComicController {

    @Autowired
    private ComicConfig config;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final List<String> SUPPORTED_EXT = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov");
    private static final List<String> IMAGE_EXT = Arrays.asList(".jpg", ".jpeg", ".png", ".webp");

    @Operation(summary = "获取所有漫画系列", description = "扫描 HQ 根目录下的顶级文件夹作为漫画系列，支持 Redis 缓存。")
    @ApiResponse(responseCode = "200", description = "请求成功，返回漫画系列名称数组")
    @GetMapping("/api/series")
    public List<String> listSeries() throws IOException {
        String cacheKey = "series_list";
        if (REDIS_ENABLED) {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.info("Redis 缓存命中: key={}", cacheKey);
                return objectMapper.readValue(cached, new TypeReference<List<String>>() {
                });
            }
            log.info("Redis 缓存未命中: key={}", cacheKey);
        }
        Path hqPath = config.getHqPath();
        log.info("开始扫描物理路径: {}", hqPath.toAbsolutePath());
        if (!Files.exists(hqPath)) {
            log.warn("警告：路径不存在 -> {}", hqPath.toAbsolutePath());
            return Collections.emptyList();
        }

        List<String> series = Files.list(hqPath)
                .filter(Files::isDirectory)
                .map(p -> p.getFileName().toString())
                .sorted(this::naturalCompare)
                .collect(Collectors.toList());
        log.info("成功扫描到 {} 个漫画系列", series.size());

        if (REDIS_ENABLED) {
            log.debug("正在更新 Redis 缓存, 过期时间: {} 秒", config.getCacheExpiration());
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(series),
                    config.getCacheExpiration(),
                    TimeUnit.SECONDS);
        }
        return series;
    }

    @Operation(summary = "递归获取章节列表", description = "根据系列名称递归查找包含媒体文件的目录，返回路径标识。")
    @ApiResponse(responseCode = "200", description = "返回章节路径对象数组")
    @GetMapping("/api/chapters/{seriesName}")
    public List<Map<String, String>> listChapters(
            @Parameter(description = "漫画系列名称", required = true)
            @PathVariable String seriesName) throws IOException {
        log.info("[Chapters] 请求获取系列章节: {}", seriesName);
        String cacheKey = "chapters_list:" + seriesName;

        if (REDIS_ENABLED) {
            String cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                log.info("[Chapters] 缓存命中: {}", seriesName);
                return objectMapper.readValue(cachedData, new TypeReference<List<Map<String, String>>>() {
                });
            }
            log.info("[Chapters] 缓存未命中: {}", seriesName);
        }

        Path seriesPath = config.getHqPath().resolve(seriesName);
        if (!Files.exists(seriesPath)) {
            log.warn("[Chapters] 路径不存在: {}", seriesPath.toAbsolutePath());
            return Collections.emptyList();
        }

        List<Map<String, String>> chaptersData = findChaptersRecursive(seriesPath, "", seriesName);

        log.info("[Chapters] 递归扫描完成: {}, 找到章节数: {}", seriesName, chaptersData.size());

        if (REDIS_ENABLED) {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(chaptersData), config.getCacheExpiration(), TimeUnit.SECONDS);
        }
        return chaptersData;
    }

    @Operation(summary = "获取章节内的文件列表", description = "返回指定章节目录下所有支持媒体文件的展示元数据。")
    @ApiResponse(responseCode = "200", description = "返回章节路径、文件元数据数组与总数")
    @GetMapping("/api/chapter/{seriesName}")
    public ResponseEntity<Map<String, Object>> listChapterFiles(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false) @Parameter(description = "章节路径ID（多级目录）", required = false) String chapterPath) throws IOException {

        if (chapterPath == null || chapterPath.isEmpty()) {
            chapterPath = "";
        } else {
            chapterPath = URLDecoder.decode(chapterPath, StandardCharsets.UTF_8);
        }

        log.info("[Files] 获取文件列表 - 系列: {}, 章节路径: {}", seriesName, chapterPath);

        String cacheKey = "chapter_files:" + seriesName + ":" + chapterPath;
        Path chapterPathResolved = config.getHqPath().resolve(seriesName).resolve(chapterPath);
        if (!Files.exists(chapterPathResolved) || !Files.isDirectory(chapterPathResolved)) {
            log.warn("[Files] 目录不存在: {}", chapterPathResolved.toAbsolutePath());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(buildChapterFilesResponse(chapterPath, Collections.emptyList()));
        }

        List<String> files;
        if (REDIS_ENABLED) {
            String cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                log.info("[Files] 缓存命中: {}", cacheKey);
                files = objectMapper.readValue(cachedData, new TypeReference<List<String>>() {
                });
                return ResponseEntity.ok(buildChapterFilesResponse(seriesName, chapterPath, chapterPathResolved, files));
            }
            log.info("[Files] 缓存未命中: {}", cacheKey);
        }

        files = listSupportedMediaFiles(chapterPathResolved);

        log.info("[Files] 扫描到文件数: {}", files.size());

        if (REDIS_ENABLED) {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(files),
                    config.getCacheExpiration(),
                    TimeUnit.SECONDS
            );
        }

        return ResponseEntity.ok(buildChapterFilesResponse(seriesName, chapterPath, chapterPathResolved, files));
    }

    @Operation(summary = "按需获取层级节点", description = "返回指定系列和相对路径下的直接子节点，目录与章节混合返回。")
    @ApiResponse(responseCode = "200", description = "返回当前层级路径和节点数组")
    @ApiResponse(responseCode = "400", description = "路径非法")
    @ApiResponse(responseCode = "404", description = "目标目录不存在")
    @GetMapping("/api/levels/{seriesName}")
    public ResponseEntity<Map<String, Object>> listLevelNodes(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false, defaultValue = "") @Parameter(description = "系列内相对路径", required = false) String path) throws IOException {

        String decodedPath = path.isEmpty() ? "" : URLDecoder.decode(path, StandardCharsets.UTF_8);
        log.info("[Levels] 请求层级节点 - 系列: {}, 路径: {}", seriesName, decodedPath);

        String cacheKey = "v2:level:" + seriesName + ":" + decodedPath;
        if (REDIS_ENABLED) {
            String cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                log.info("[Levels] 缓存命中: {}", cacheKey);
                Map<String, Object> cachedResponse = objectMapper.readValue(cachedData, new TypeReference<Map<String, Object>>() {
                });
                return ResponseEntity.ok(cachedResponse);
            }
            log.info("[Levels] 缓存未命中: {}", cacheKey);
        }

        Path seriesPath = config.getHqPath().resolve(seriesName).normalize();
        Path targetPath = decodedPath.isEmpty() ? seriesPath : seriesPath.resolve(decodedPath).normalize();
        if (!targetPath.startsWith(seriesPath)) {
            log.warn("[Levels] 非法路径访问 - 系列: {}, 路径: {}", seriesName, decodedPath);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(buildLevelResponse(decodedPath, Collections.<Map<String, Object>>emptyList()));
        }
        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
            log.warn("[Levels] 目录不存在: {}", targetPath.toAbsolutePath());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(buildLevelResponse(decodedPath, Collections.<Map<String, Object>>emptyList()));
        }

        List<Map<String, Object>> nodes = scanLevelNodes(targetPath, decodedPath, seriesName);
        Map<String, Object> response = buildLevelResponse(decodedPath, nodes);
        log.info("[Levels] 扫描完成 - 系列: {}, 路径: {}, 节点数: {}", seriesName, decodedPath, nodes.size());

        if (REDIS_ENABLED) {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), config.getCacheExpiration(), TimeUnit.SECONDS);
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildChapterFilesResponse(String chapterPath, List<Map<String, Object>> filesMetadata) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", chapterPath);
        response.put("files", filesMetadata);
        response.put("total", filesMetadata.size());
        return response;
    }

    private Map<String, Object> buildChapterFilesResponse(String seriesName, String chapterPath, Path chapterPathResolved, List<String> files) throws IOException {
        List<Map<String, Object>> filesMetadata = new ArrayList<>();
        for (String filename : files) {
            filesMetadata.add(buildFileMetadata(seriesName, chapterPath, chapterPathResolved, filename));
        }
        return buildChapterFilesResponse(chapterPath, filesMetadata);
    }

    private Map<String, Object> buildFileMetadata(String seriesName, String chapterPath, Path chapterPathResolved, String filename) throws IOException {
        String baseName = stripExtension(filename);
        boolean imageFile = isImageFile(filename);
        Path hqFile = chapterPathResolved.resolve(filename);
        String lqFilename = baseName + ".webp";
        Path lqFile = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(lqFilename);

        Map<String, Object> fileMeta = new HashMap<>();
        fileMeta.put("name", filename);
        fileMeta.put("baseName", baseName);
        fileMeta.put("mediaType", imageFile ? "image" : "video");
        fileMeta.put("preferredSource", Files.exists(lqFile) ? "lq" : "hq");
        fileMeta.put("hq", buildHqInfo(seriesName, chapterPath, filename, hqFile));
        fileMeta.put("lq", buildLqInfo(seriesName, chapterPath, lqFilename, lqFile));
        if (!imageFile) {
            fileMeta.put("videoUrl", buildVideoUrl(seriesName, chapterPath, filename));
        }
        return fileMeta;
    }

    private Map<String, Object> buildHqInfo(String seriesName, String chapterPath, String filename, Path hqFile) throws IOException {
        Map<String, Object> hqInfo = new HashMap<>();
        boolean exists = Files.exists(hqFile);
        hqInfo.put("exists", exists);
        hqInfo.put("size", exists ? Files.size(hqFile) : 0L);
        hqInfo.put("url", buildHQUrl(seriesName, chapterPath, filename));
        return hqInfo;
    }

    private Map<String, Object> buildLqInfo(String seriesName, String chapterPath, String filename, Path lqFile) {
        Map<String, Object> lqInfo = new HashMap<>();
        lqInfo.put("exists", Files.exists(lqFile));
        lqInfo.put("url", buildLQUrl(seriesName, chapterPath, filename));
        return lqInfo;
    }

    private String buildHQUrl(String series, String path, String filename) {
        return "/hq_image/" + encodePath(series, path, filename);
    }

    private String buildLQUrl(String series, String path, String filename) {
        return "/lq_image/" + encodePath(series, path, filename);
    }

    private String buildVideoUrl(String series, String path, String filename) {
        return "/video/" + encodePath(series, path, filename);
    }

    private String encodePath(String series, String path, String filename) {
        String fullPath = path == null || path.isEmpty()
                ? series + "/" + filename
                : series + "/" + path + "/" + filename;
        return fullPath.replace("\\", "/");
    }

    private Map<String, Object> buildLevelResponse(String decodedPath, List<Map<String, Object>> nodes) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", decodedPath);
        response.put("nodes", nodes);
        return response;
    }

    private List<Map<String, Object>> scanLevelNodes(Path targetPath, String currentRel, String seriesName) throws IOException {
        List<Map<String, Object>> nodes = new ArrayList<>();
        try (Stream<Path> stream = Files.list(targetPath)) {
            List<Path> entries = stream
                    .filter(Files::isDirectory)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                    .collect(Collectors.toList());

            for (Path entry : entries) {
                String name = entry.getFileName().toString();
                String entryRel = currentRel.isEmpty() ? name : currentRel + "/" + name;
                List<String> mediaFiles = listSupportedMediaFiles(entry);
                if (mediaFiles.isEmpty()) {
                    nodes.add(buildDirectoryNode(entry, name, entryRel));
                } else {
                    nodes.add(buildLevelChapterNode(seriesName, name, entryRel, mediaFiles));
                }
            }
        }
        return nodes;
    }

    private Map<String, Object> buildDirectoryNode(Path directory, String name, String relativePath) throws IOException {
        Map<String, Object> node = new HashMap<>();
        node.put("type", "directory");
        node.put("name", name);
        node.put("path", relativePath);
        node.put("has_children", hasChildDirectories(directory));
        return node;
    }

    private boolean hasChildDirectories(Path directory) throws IOException {
        try (Stream<Path> stream = Files.list(directory)) {
            return stream.anyMatch(Files::isDirectory);
        }
    }

    private Map<String, Object> buildLevelChapterNode(String seriesName, String name, String relativePath, List<String> mediaFiles) {
        Map<String, Object> node = new HashMap<>();
        String normalizedPath = relativePath.replace("\\", "/");
        node.put("type", "chapter");
        node.put("name", name);
        node.put("path_id", normalizedPath);
        node.put("total_files", mediaFiles.size());

        Optional<String> coverFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
        if (coverFile.isPresent()) {
            node.put("cover_file", coverFile.get());
            node.put("cover_source", resolveCoverSource(seriesName, normalizedPath, coverFile.get()));
        }
        return node;
    }

    private List<Map<String, String>> findChaptersRecursive(Path root, String currentRel, String seriesName) throws IOException {
        Path fullPath = root.resolve(currentRel);
        List<String> mediaFiles = listSupportedMediaFiles(fullPath);

        if (!mediaFiles.isEmpty()) {
            return List.of(buildChapterData(seriesName, currentRel, mediaFiles));
        }

        List<Path> subDirs = listSortedSubDirectories(fullPath);
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

    private List<Path> listSortedSubDirectories(Path directory) throws IOException {
        try (Stream<Path> list = Files.list(directory)) {
            return list.filter(Files::isDirectory)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                    .collect(Collectors.toList());
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

    private List<String> listSupportedMediaFiles(Path chapterPath) throws IOException {
        try (Stream<Path> stream = Files.list(chapterPath)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .filter(this::isSupportedMediaFile)
                    .sorted(this::naturalCompare)
                    .collect(Collectors.toList());
        }
    }

    private Map<String, String> buildChapterData(String seriesName, String relativePath, List<String> mediaFiles) {
        String normalizedPath = relativePath.replace("\\", "/");
        Map<String, String> chapterData = new HashMap<>();
        chapterData.put("path_id", normalizedPath);
        chapterData.put("name", normalizedPath.isEmpty() ? seriesName : Paths.get(normalizedPath).getFileName().toString());
        chapterData.put("total_files", String.valueOf(mediaFiles.size()));

        Optional<String> coverFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
        if (coverFile.isPresent()) {
            chapterData.put("cover_file", coverFile.get());
            chapterData.put("cover_source", resolveCoverSource(seriesName, normalizedPath, coverFile.get()));
        }
        return chapterData;
    }

    private String resolveCoverSource(String seriesName, String chapterPath, String coverFile) {
        String baseName = stripExtension(coverFile);
        Path lqCoverPath = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(baseName + ".webp");
        return Files.exists(lqCoverPath) ? "lq" : "hq";
    }

    private String stripExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
    }

    private boolean isSupportedMediaFile(String filename) {
        String lowerName = filename.toLowerCase();
        return SUPPORTED_EXT.stream().anyMatch(lowerName::endsWith);
    }

    private boolean isImageFile(String filename) {
        String lowerName = filename.toLowerCase();
        return IMAGE_EXT.stream().anyMatch(lowerName::endsWith);
    }

    private int naturalCompare(String s1, String s2) {
        return CaseInsensitiveSimpleNaturalComparator.getInstance().compare(s1, s2);
    }
}