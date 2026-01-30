package com.nianer.comic.Controller;

import com.nianer.comic.Config.ComicConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import net.greypanther.natsort.CaseInsensitiveSimpleNaturalComparator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.nianer.comic.Component.RedisValidator.REDIS_ENABLED;

@Slf4j
@RestController
@RequestMapping("/")
@Tag(name = "漫画管理接口", description = "负责漫画系列扫描、章节目录索引及图片资源流化")
public class ComicController {

    @Autowired
    private ComicConfig config;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final List<String> SUPPORTED_EXT = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov");

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
            log.debug("Redis 缓存未命中: key={}", cacheKey);
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
        }

        Path seriesPath = config.getHqPath().resolve(seriesName);
        if (!Files.exists(seriesPath)) {
            log.warn("[Chapters] 路径不存在: {}", seriesPath.toAbsolutePath());
            return Collections.emptyList();
        }

        List<String> relativePaths = new ArrayList<>();
        findChaptersRecursive(seriesPath, "", relativePaths);

        List<Map<String, String>> chaptersData = relativePaths.stream().map(p -> {
            Map<String, String> map = new HashMap<>();
            map.put("path_id", p);
            map.put("name", p.isEmpty() ? seriesName : Paths.get(p).getFileName().toString());
            return map;
        }).collect(Collectors.toList());

        log.info("[Chapters] 递归扫描完成: {}, 找到章节数: {}", seriesName, chaptersData.size());

        if (REDIS_ENABLED) {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(chaptersData), config.getCacheExpiration(), TimeUnit.SECONDS);
        }
        return chaptersData;
    }

    @Operation(summary = "获取章节内的文件列表", description = "返回指定章节目录下所有支持的图片和视频文件名。")
    @ApiResponse(responseCode = "200", description = "返回章节与文件名映射关系")
    @GetMapping("/api/chapter/{seriesName}/**")
    public ResponseEntity<Map<String, List<String>>> listChapterFiles(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            HttpServletRequest request) throws IOException {

        String fullPathInApp = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String chapterPathId = new AntPathMatcher().extractPathWithinPattern("/api/chapter/{seriesName}/**", fullPathInApp);
        chapterPathId = URLDecoder.decode(chapterPathId, StandardCharsets.UTF_8);

        log.info("[Files] 获取文件列表 - 系列: {}, 章节路径: {}", seriesName, chapterPathId);

        String cacheKey = "chapter_files:" + seriesName + ":" + chapterPathId;
        if (REDIS_ENABLED) {
            String cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                log.debug("[Files] 缓存命中: {}", cacheKey);
                List<String> files = objectMapper.readValue(cachedData, new TypeReference<List<String>>() {
                });
                return ResponseEntity.ok(Collections.singletonMap("files", files));
            }
        }


        Path chapterPath = config.getHqPath().resolve(seriesName).resolve(chapterPathId);
        if (!Files.exists(chapterPath) || !Files.isDirectory(chapterPath)) {
            log.warn("[Files] 目录不存在: {}", chapterPath.toAbsolutePath());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("files", new ArrayList<>()));
        }

        List<String> files;
        try (Stream<Path> stream = Files.list(chapterPath)) {
            files = stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .filter(name -> {
                        String lowerName = name.toLowerCase();
                        return SUPPORTED_EXT.stream().anyMatch(lowerName::endsWith);
                    })
                    .sorted(this::naturalCompare)
                    .collect(Collectors.toList());
        }

        log.info("[Files] 扫描到文件数: {}", files.size());

        if (REDIS_ENABLED) {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(files),
                    config.getCacheExpiration(),
                    TimeUnit.SECONDS
            );
        }

        return ResponseEntity.ok(Collections.singletonMap("files", files));
    }

    @Operation(
            summary = "查看媒体文件",
            description = "根据路径获取图片或视频流。优先尝试返回 LQ（低质量 WebP）缩略图，不存在则返回 HQ 原图。",
            responses = {
                    @ApiResponse(responseCode = "200", description = "成功获取文件流",
                            content = @Content(mediaType = "image/webp")),
                    @ApiResponse(responseCode = "404", description = "找不到指定文件")
            }
    )
    @GetMapping("/image/{chapterName}/{seriesName}/{filename}")
    public ResponseEntity<Resource> serveImage(
            @Parameter(description = "章节名称", required = true) @PathVariable String chapterName,
            @Parameter(description = "漫画系列名称", required = true) @PathVariable String seriesName,
            @Parameter(description = "文件名(图片或视频)", required = true) @PathVariable String filename) {

        Path hqFile = config.getHqPath().resolve(chapterName).resolve(seriesName).resolve(filename);
        String webpName = filename.substring(0, filename.lastIndexOf(".")) + ".webp";
        Path lqFile = config.getLqPath().resolve(chapterName).resolve(seriesName).resolve(webpName);

        Path finalFile;
        if (Files.exists(lqFile)) {
            log.debug("[Stream] 命中 LQ 缩略图: {}", webpName);
            finalFile = lqFile;
        } else {
            log.debug("[Stream] 未命中 LQ，返回 HQ 原图: {}", filename);
            finalFile = hqFile;
        }

        if (!Files.exists(finalFile)) {
            log.error("[Stream] 文件不存在: {}", finalFile.toAbsolutePath());
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(config.getCacheExpiration(), TimeUnit.SECONDS))
                .header(HttpHeaders.CONTENT_TYPE, finalFile.toString().endsWith(".webp") ? "image/webp" : "image/jpeg")
                .body(new FileSystemResource(finalFile));
    }

    // 辅助方法：递归发现包含媒体的目录
    private void findChaptersRecursive(Path root, String currentRel, List<String> result) throws IOException {
        Path fullPath = root.resolve(currentRel);

        boolean hasMedia;
        try (Stream<Path> list = Files.list(fullPath)) {
            hasMedia = list.anyMatch(p -> {
                String name = p.getFileName().toString().toLowerCase();
                return SUPPORTED_EXT.stream().anyMatch(name::endsWith);
            });
        }

        if (hasMedia) {
            result.add(currentRel.replace("\\", "/"));
        } else {
            try (Stream<Path> list = Files.list(fullPath)) {
                List<Path> subDirs = list.filter(Files::isDirectory)
                        .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                        .collect(Collectors.toList());
                for (Path dir : subDirs) {
                    findChaptersRecursive(root, currentRel.isEmpty() ? dir.getFileName().toString() : currentRel + "/" + dir.getFileName().toString(), result);
                }
            }
        }
    }

    // 辅助方法：自然排序比较器
    private int naturalCompare(String s1, String s2) {
        return CaseInsensitiveSimpleNaturalComparator.getInstance().compare(s1, s2);
    }
}