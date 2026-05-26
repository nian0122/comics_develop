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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    /**
     * 获取根层级的漫画系列节点列表。
     *
     * <p>扫描 HQ 根目录下的每个系列目录，为每个系列构建一个 type=series 的节
     * 点，包含封面 URL 和章节统计信息。结果缓存于 v2:level:__root__。</p>
     *
     * @return 包含 HTTP 状态码和层级节点响应 body 的结果
     */
    public LevelNodesResult listRootLevels() throws IOException {
        String cacheKey = "v2:level:__root__";
        Optional<Map<String, Object>> cached = cacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {
        }, "[RootLevels]");
        if (cached.isPresent()) {
            return new LevelNodesResult(HttpStatus.OK, cached.get());
        }

        Path hqPath = config.getHqPath();
        if (!Files.exists(hqPath) || !Files.isDirectory(hqPath)) {
            log.warn("[RootLevels] HQ 根目录不存在: {}", hqPath.toAbsolutePath());
            return new LevelNodesResult(HttpStatus.OK, mediaService.buildLevelResponse("", Collections.emptyList()));
        }

        List<Map<String, Object>> nodes = new ArrayList<>();
        try (Stream<Path> stream = Files.list(hqPath)) {
            List<Path> seriesDirs = stream
                    .filter(Files::isDirectory)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), mediaService::naturalCompare))
                    .collect(Collectors.toList());

            for (Path seriesDir : seriesDirs) {
                nodes.add(mediaService.buildSeriesNode(seriesDir));
            }
        }

        log.info("[RootLevels] 扫描完成，共 {} 个系列", nodes.size());
        Map<String, Object> response = mediaService.buildLevelResponse("", nodes);
        cacheService.put(cacheKey, response);
        return new LevelNodesResult(HttpStatus.OK, response);
    }

    /**
     * 获取章节目录中的媒体文件展示数据。
     *
     * <p>该方法负责目录存在性检查、完整响应缓存和响应状态封装；媒体 URL、HQ/LQ 状态由
     * {@link ComicMediaService} 在缓存写入前生成。</p>
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @return 包含 HTTP 状态码和响应 body 的章节文件结果
     */
    public ChapterFilesResult getChapterFiles(String seriesName, String chapterPath) throws IOException {
        String normalizedChapterPath = chapterPath == null ? "" : chapterPath;
        log.info("[Files] 获取文件列表 - 系列: {}, 章节路径: {}", seriesName, normalizedChapterPath);

        // 章节文件列表缓存完整响应，命中后直接返回缓存时刻的文件元数据和 HQ/LQ 状态。
        String cacheKey = "v2:chapter_files:" + seriesName + ":" + normalizedChapterPath;
        Path chapterPathResolved = config.getHqPath().resolve(seriesName).resolve(normalizedChapterPath);
        if (!Files.exists(chapterPathResolved) || !Files.isDirectory(chapterPathResolved)) {
            log.warn("[Files] 目录不存在: {}", chapterPathResolved.toAbsolutePath());
            return new ChapterFilesResult(HttpStatus.NOT_FOUND, mediaService.buildChapterFilesResponse(normalizedChapterPath, Collections.emptyList()));
        }

        Optional<Map<String, Object>> cached = cacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {
        }, "[Files]");
        if (cached.isPresent()) {
            return new ChapterFilesResult(HttpStatus.OK, cached.get());
        }

        List<String> files = mediaService.listSupportedMediaFiles(chapterPathResolved);
        log.info("[Files] 扫描到文件数: {}", files.size());
        Map<String, Object> response = mediaService.buildChapterFilesResponse(seriesName, normalizedChapterPath, chapterPathResolved, files);
        cacheService.put(cacheKey, response);

        return new ChapterFilesResult(HttpStatus.OK, response);
    }

    /**
     * 获取某个系列路径下的当前层级节点。
     *
     * <p>该方法只返回目标目录的直接子节点，并通过 normalize + startsWith 防止相对路径逃逸出系列目录。</p>
     *
     * @param seriesName 漫画系列名称
     * @param decodedPath 已 URL 解码的系列内相对路径，空字符串表示系列根目录
     * @return 包含 HTTP 状态码和层级节点响应 body 的结果
     */
    public LevelNodesResult listLevelNodes(String seriesName, String decodedPath) throws IOException {
        log.info("[Levels] 请求层级节点 - 系列: {}, 路径: {}", seriesName, decodedPath);

        // 层级节点响应包含目录/章节混合节点，缓存命中时避免重复触碰漫画目录的大量文件系统条目。
        String cacheKey = decodedPath.isEmpty()
                ? "v2:level:" + seriesName
                : "v2:level:" + seriesName + ":" + decodedPath;
        Optional<Map<String, Object>> cached = cacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {
        }, "[Levels]");
        if (cached.isPresent()) {
            return new LevelNodesResult(HttpStatus.OK, cached.get());
        }

        Path seriesPath = config.getHqPath().resolve(seriesName).normalize();
        Path targetPath = decodedPath.isEmpty() ? seriesPath : seriesPath.resolve(decodedPath).normalize();
        // normalize 后仍必须校验 startsWith，防止 path=.. 逃逸出当前漫画系列目录。
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

    /**
     * 扫描当前目录的直接子目录并转换为前端可消费的层级节点。
     *
     * <p>子目录内存在支持媒体文件时视为章节节点，否则视为目录节点；这里不递归展开更深层级。</p>
     *
     * @param targetPath 当前要扫描的物理目录
     * @param currentRel 当前目录相对系列根目录的路径
     * @param seriesName 漫画系列名称，用于构建章节封面来源
     * @return 当前层级的节点列表
     */
    private List<Map<String, Object>> scanLevelNodes(Path targetPath, String currentRel, String seriesName) throws IOException {
        List<Map<String, Object>> nodes = new ArrayList<>();
        // 只列出当前层级的直接子目录，避免一次性递归加载整棵章节树。
        List<Path> entries = mediaService.listSortedSubDirectories(targetPath);

        for (Path entry : entries) {
            String name = entry.getFileName().toString();
            String entryRel = currentRel.isEmpty() ? name : currentRel + "/" + name;
            // 当前约定：目录内出现支持的媒体文件即视为章节，否则作为可继续展开的目录节点。
            ComicMediaService.ChapterPreview preview = mediaService.inspectChapterPreview(entry);
            if (!preview.hasMedia()) {
                nodes.add(mediaService.buildDirectoryNode(entry, name, entryRel));
            } else {
                nodes.add(mediaService.buildLevelChapterNode(seriesName, name, entryRel, preview));
            }
        }
        return nodes;
    }

    public record ChapterFilesResult(HttpStatus status, Map<String, Object> body) {
        public boolean found() {
            return status == HttpStatus.OK;
        }
    }

    public record LevelNodesResult(HttpStatus status, Map<String, Object> body) {
    }
}
