package com.nianer.comic.Controller;

import com.nianer.comic.Service.ComicCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "漫画管理接口", description = "负责漫画系列扫描、章节目录索引")
public class ComicController {

    private final ComicCatalogService catalogService;

    public ComicController(ComicCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @Operation(summary = "获取所有漫画系列", description = "扫描 HQ 根目录下的顶级文件夹作为漫画系列，支持 Redis 缓存。")
    @ApiResponse(responseCode = "200", description = "请求成功，返回漫画系列名称数组")
    @GetMapping("/series")
    /**
     * 获取 HQ 根目录下的漫画系列列表。
     *
     * @return 按自然排序排列的系列名称数组
     */
    public List<String> listSeries() throws IOException {
        return catalogService.listSeries();
    }

    @Operation(summary = "获取章节内的文件列表", description = "返回指定章节目录下所有支持媒体文件的展示元数据。")
    @ApiResponse(responseCode = "200", description = "返回章节路径、文件元数据数组与总数")
    @GetMapping("/chapter/{seriesName}")
    /**
     * 获取指定章节目录下的媒体文件元数据。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径，允许为空或 URL 编码后的多级中文路径
     * @return 章节路径、文件元数据和文件总数，目录不存在时由 Service 返回 404 body
     */
    public ResponseEntity<Map<String, Object>> listChapterFiles(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false) @Parameter(description = "章节路径ID（多级目录）", required = false) String chapterPath) throws IOException {

        // 前端会把多级中文章节路径作为 query 参数传入；Controller 只负责解码和状态透传，文件扫描逻辑留给 Service。
        String decodedChapterPath = chapterPath == null || chapterPath.isEmpty()
                ? ""
                : URLDecoder.decode(chapterPath, StandardCharsets.UTF_8);
        ComicCatalogService.ChapterFilesResult result = catalogService.getChapterFiles(seriesName, decodedChapterPath);
        return ResponseEntity.status(result.status()).body(result.body());
    }

    @Operation(summary = "按需获取层级节点", description = "返回指定系列和相对路径下的直接子节点，目录与章节混合返回。")
    @ApiResponse(responseCode = "200", description = "返回当前层级路径和节点数组")
    @ApiResponse(responseCode = "400", description = "路径非法")
    @ApiResponse(responseCode = "404", description = "目标目录不存在")
    @GetMapping("/levels/{seriesName}")
    /**
     * 按需获取指定目录层级下的直接子节点。
     *
     * @param seriesName 漫画系列名称
     * @param path 系列内相对路径，空值表示系列根目录，允许 URL 编码后的中文路径
     * @return 当前层级路径和节点数组，节点可能是可展开目录或可阅读章节
     */
    public ResponseEntity<Map<String, Object>> listLevelNodes(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false, defaultValue = "") @Parameter(description = "系列内相对路径", required = false) String path) throws IOException {

        // 层级接口按需加载当前路径的直接子节点；path 可能包含 URL 编码后的中文目录名。
        String decodedPath = path.isEmpty() ? "" : URLDecoder.decode(path, StandardCharsets.UTF_8);
        ComicCatalogService.LevelNodesResult result = catalogService.listLevelNodes(seriesName, decodedPath);
        return ResponseEntity.status(result.status()).body(result.body());
    }
}
