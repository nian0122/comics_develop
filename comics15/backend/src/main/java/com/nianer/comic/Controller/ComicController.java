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
@RequestMapping("/")
@Tag(name = "漫画管理接口", description = "负责漫画系列扫描、章节目录索引")
public class ComicController {

    private final ComicCatalogService catalogService;

    public ComicController(ComicCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @Operation(summary = "获取所有漫画系列", description = "扫描 HQ 根目录下的顶级文件夹作为漫画系列，支持 Redis 缓存。")
    @ApiResponse(responseCode = "200", description = "请求成功，返回漫画系列名称数组")
    @GetMapping("/api/series")
    public List<String> listSeries() throws IOException {
        return catalogService.listSeries();
    }

    @Operation(summary = "递归获取章节列表", description = "根据系列名称递归查找包含媒体文件的目录，返回路径标识。")
    @ApiResponse(responseCode = "200", description = "返回章节路径对象数组")
    @GetMapping("/api/chapters/{seriesName}")
    public List<Map<String, String>> listChapters(
            @Parameter(description = "漫画系列名称", required = true)
            @PathVariable String seriesName) throws IOException {
        return catalogService.listChapters(seriesName);
    }

    @Operation(summary = "获取章节内的文件列表", description = "返回指定章节目录下所有支持媒体文件的展示元数据。")
    @ApiResponse(responseCode = "200", description = "返回章节路径、文件元数据数组与总数")
    @GetMapping("/api/chapter/{seriesName}")
    public ResponseEntity<Map<String, Object>> listChapterFiles(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false) @Parameter(description = "章节路径ID（多级目录）", required = false) String chapterPath) throws IOException {

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
    @GetMapping("/api/levels/{seriesName}")
    public ResponseEntity<Map<String, Object>> listLevelNodes(
            @PathVariable @Parameter(description = "漫画系列名称", required = true) String seriesName,
            @RequestParam(required = false, defaultValue = "") @Parameter(description = "系列内相对路径", required = false) String path) throws IOException {

        String decodedPath = path.isEmpty() ? "" : URLDecoder.decode(path, StandardCharsets.UTF_8);
        ComicCatalogService.LevelNodesResult result = catalogService.listLevelNodes(seriesName, decodedPath);
        return ResponseEntity.status(result.status()).body(result.body());
    }
}
