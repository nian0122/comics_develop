package com.nianer.comic.Service;

import com.nianer.comic.Config.ComicConfig;
import net.greypanther.natsort.CaseInsensitiveSimpleNaturalComparator;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class ComicMediaService {

    private static final List<String> SUPPORTED_EXT = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov");
    private static final List<String> IMAGE_EXT = Arrays.asList(".jpg", ".jpeg", ".png", ".webp");

    private final ComicConfig config;

    public ComicMediaService(ComicConfig config) {
        this.config = config;
    }

    /**
     * 列出目录下所有受支持的媒体文件名,获取章节内的文件列表接口调用。
     *
     * @param chapterPath 章节物理目录
     * @return 自然排序后的媒体文件名列表
     */
    public List<String> listSupportedMediaFiles(Path chapterPath) throws IOException {
        try (Stream<Path> stream = Files.list(chapterPath)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .filter(this::isSupportedMediaFile)
                    // 漫画文件名通常含数字，必须用自然排序保证 2.jpg 排在 10.jpg 前面。
                    .sorted(this::naturalCompare)
                    .collect(Collectors.toList());
        }
    }

    /**
     * 检查目录是否可作为章节，并取第一张图片作为层级封面。
     *
     * <p>层级接口只需要判断目录中是否存在媒体文件和封面图片，不需要完整媒体文件名列表；
     * 完整列表由章节文件接口通过 {@link #listSupportedMediaFiles(Path)} 提供。</p>
     *
     * @param chapterPath 待检查的章节候选目录
     * @return 章节预览信息，hasMedia=true 表示目录内出现了受支持媒体文件
     */
    public ChapterPreview inspectChapterPreview(Path chapterPath) throws IOException {
        try (Stream<Path> stream = Files.list(chapterPath)) {
            List<String> mediaFiles = stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .filter(this::isSupportedMediaFile)
                    .sorted(this::naturalCompare)
                    .toList();
            boolean hasMedia = !mediaFiles.isEmpty();
            Optional<String> firstImageFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
            return new ChapterPreview(hasMedia, mediaFiles.size(), firstImageFile);
        }
    }

    /**
     * 列出目录下的直接子目录。
     *
     * @param directory 要扫描的物理目录
     * @return 自然排序后的直接子目录路径列表
     */
    public List<Path> listSortedSubDirectories(Path directory) throws IOException {
        try (Stream<Path> list = Files.list(directory)) {
            return list.filter(Files::isDirectory)
                    // 目录顺序直接影响前端章节列表展示，保持和文件列表一致的自然排序。
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                    .collect(Collectors.toList());
        }
    }

    /**
     * 构建章节文件列表接口的响应 body。
     *
     * @param chapterPath 系列内章节相对路径
     * @param filesMetadata 已构建好的文件元数据列表
     * @return 包含 path、files、total 的响应 Map
     */
    public Map<String, Object> buildChapterFilesResponse(String chapterPath, List<Map<String, Object>> filesMetadata) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", chapterPath);
        response.put("files", filesMetadata);
        response.put("total", filesMetadata.size());
        return response;
    }

    /**
     * 将章节文件名列表转换为带 URL 和来源信息的响应 body。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param chapterPathResolved 章节物理目录
     * @param files 已排序的媒体文件名列表
     * @return 章节文件列表接口响应 body
     */
    public Map<String, Object> buildChapterFilesResponse(String seriesName, String chapterPath, Path chapterPathResolved, List<String> files) throws IOException {
        List<Map<String, Object>> filesMetadata = new ArrayList<>();
        for (String filename : files) {
            filesMetadata.add(buildFileMetadata(seriesName, chapterPath, chapterPathResolved, filename));
        }
        return buildChapterFilesResponse(chapterPath, filesMetadata);
    }

    /**
     * 构建旧章节列表场景使用的章节摘要数据。
     *
     * @param seriesName 漫画系列名称
     * @param relativePath 系列内章节相对路径
     * @param mediaFiles 章节中的媒体文件名列表
     * @return 章节路径、名称、文件数和可选封面信息
     */
    public Map<String, String> buildChapterData(String seriesName, String relativePath, List<String> mediaFiles) {
        String normalizedPath = normalizePath(relativePath);
        Map<String, String> chapterData = new HashMap<>();
        chapterData.put("path_id", normalizedPath);
        chapterData.put("name", normalizedPath.isEmpty() ? seriesName : Path.of(normalizedPath).getFileName().toString());
        chapterData.put("total_files", String.valueOf(mediaFiles.size()));

        Optional<String> coverFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
        if (coverFile.isPresent()) {
            chapterData.put("cover_url", buildCoverUrl(seriesName, normalizedPath, coverFile.get()));
        }
        return chapterData;
    }

    /**
     * 构建层级接口中的目录节点。
     *
     * @param directory 目录节点对应的物理目录
     * @param name 节点展示名
     * @param relativePath 节点相对系列根目录的路径
     * @return type=directory 的节点数据
     */
    public Map<String, Object> buildDirectoryNode(Path directory, String name, String relativePath) throws IOException {
        Map<String, Object> node = new HashMap<>();
        node.put("type", "directory");
        node.put("name", name);
        node.put("path", relativePath);
        // 这里只标记是否还能展开，不在当前响应中返回下一层节点内容。
        node.put("has_children", hasChildDirectories(directory));
        return node;
    }

    /**
     * 构建层级接口中的章节节点。
     *
     * @param seriesName 漫画系列名称
     * @param name 节点展示名
     * @param relativePath 章节相对系列根目录的路径
     * @param preview 章节预览信息
     * @return type=chapter 的节点数据
     */
    public Map<String, Object> buildLevelChapterNode(String seriesName, String name, String relativePath, ChapterPreview preview) {
        Map<String, Object> node = new HashMap<>();
        String normalizedPath = normalizePath(relativePath);
        node.put("type", "chapter");
        node.put("name", name);
        node.put("path_id", normalizedPath);
        node.put("total_files", preview.totalFiles());

        // 封面只选择章节内第一张图片；视频/GIF 章节没有图片时不会生成封面字段。
        Optional<String> coverFile = preview.firstImageFile();
        if (coverFile.isPresent()) {
            node.put("cover_url", buildCoverUrl(seriesName, normalizedPath, coverFile.get()));
        }
        return node;
    }

    /**
     * 构建层级节点接口响应 body。
     *
     * @param decodedPath 当前层级相对路径
     * @param nodes 当前层级直接子节点列表
     * @return 包含 path 和 nodes 的响应 Map
     */
    public Map<String, Object> buildLevelResponse(String decodedPath, List<Map<String, Object>> nodes) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", decodedPath);
        response.put("nodes", nodes);
        return response;
    }

    /**
     * 按漫画文件名习惯进行大小写不敏感的自然排序比较。
     */
    public int naturalCompare(String s1, String s2) {
        return CaseInsensitiveSimpleNaturalComparator.getInstance().compare(s1, s2);
    }

    /**
     * 构建单个媒体文件的展示元数据。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param chapterPathResolved 章节物理目录
     * @param filename 媒体文件名
     * @return 包含媒体类型、HQ/LQ 信息和可选视频 URL 的文件元数据
     */
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

    /**
     * 构建 HQ 原始媒体文件的信息块。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param filename HQ 媒体文件名
     * @param hqFile HQ 文件物理路径
     * @return 包含存在状态、文件大小和 HQ 访问 URL 的 Map
     */
    private Map<String, Object> buildHqInfo(String seriesName, String chapterPath, String filename, Path hqFile) throws IOException {
        Map<String, Object> hqInfo = new HashMap<>();
        boolean exists = Files.exists(hqFile);
        hqInfo.put("exists", exists);
        hqInfo.put("size", exists ? Files.size(hqFile) : 0L);
        hqInfo.put("url", buildHQUrl(seriesName, chapterPath, filename));
        return hqInfo;
    }

    /**
     * 构建 LQ 低清 WebP 文件的信息块。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param filename LQ 文件名，通常由 HQ 文件基础名替换为 .webp 得到
     * @param lqFile LQ 文件物理路径
     * @return 包含存在状态和 LQ 访问 URL 的 Map
     */
    private Map<String, Object> buildLqInfo(String seriesName, String chapterPath, String filename, Path lqFile) {
        Map<String, Object> lqInfo = new HashMap<>();
        lqInfo.put("exists", Files.exists(lqFile));
        lqInfo.put("url", buildLQUrl(seriesName, chapterPath, filename));
        return lqInfo;
    }

    /**
     * 构建 HQ 静态资源访问路径。
     */
    private String buildHQUrl(String series, String path, String filename) {
        return "/hq_image/" + encodePath(series, path, filename);
    }

    /**
     * 构建 LQ 静态资源访问路径。
     */
    private String buildLQUrl(String series, String path, String filename) {
        return "/lq_image/" + encodePath(series, path, filename);
    }

    /**
     * 构建视频或 GIF 资源访问路径。
     */
    private String buildVideoUrl(String series, String path, String filename) {
        return "/video/" + encodePath(series, path, filename);
    }

    /**
     * 拼接系列、章节路径和文件名，并统一为前端/Nginx 使用的正斜杠路径。
     *
     * @param series 漫画系列名称
     * @param path 系列内章节相对路径，根路径可为空
     * @param filename 媒体文件名
     * @return 规范化后的相对资源路径
     */
    private String encodePath(String series, String path, String filename) {
        String fullPath = path == null || path.isEmpty()
                ? series + "/" + filename
                : series + "/" + path + "/" + filename;
        return normalizePath(fullPath);
    }

    /**
     * 判断目录下是否存在可继续展开的子目录。
     *
     * @param directory 待检查的物理目录
     * @return 存在任意直接子目录时返回 true
     */
    private boolean hasChildDirectories(Path directory) throws IOException {
        try (Stream<Path> stream = Files.list(directory)) {
            return stream.anyMatch(Files::isDirectory);
        }
    }

    /**
     * 构建章节封面 URL，优先使用 LQ，不存在则回退 HQ。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param coverFile HQ 封面文件名
     * @return LQ 存在时返回 LQ URL，否则返回 HQ URL
     */
    private String buildCoverUrl(String seriesName, String chapterPath, String coverFile) {
        String baseName = stripExtension(coverFile);
        Path lqCoverPath = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(baseName + ".webp");
        if (Files.exists(lqCoverPath)) {
            return buildLQUrl(seriesName, chapterPath, baseName + ".webp");
        } else {
            return buildHQUrl(seriesName, chapterPath, coverFile);
        }
    }

    /**
     * 判断章节封面应使用 LQ 还是 HQ 来源。
     *
     * @param seriesName 漫画系列名称
     * @param chapterPath 系列内章节相对路径
     * @param coverFile HQ 封面文件名
     * @return LQ 同名 WebP 存在时返回 lq，否则返回 hq
     */
    private String resolveCoverSource(String seriesName, String chapterPath, String coverFile) {
        String baseName = stripExtension(coverFile);
        Path lqCoverPath = config.getLqPath().resolve(seriesName).resolve(chapterPath).resolve(baseName + ".webp");
        // LQ 目录中存在同名 webp 时优先使用低清封面，否则前端回退 HQ 原图。
        return Files.exists(lqCoverPath) ? "lq" : "hq";
    }

    /**
     * 去掉文件名最后一个扩展名。
     *
     * @param filename 原始文件名
     * @return 不含最后一个扩展名的基础名
     */
    private String stripExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > -1 ? filename.substring(0, dotIndex) : filename;
    }

    /**
     * 判断文件名是否属于阅读器支持的媒体格式。
     */
    private boolean isSupportedMediaFile(String filename) {
        String lowerName = filename.toLowerCase();
        return SUPPORTED_EXT.stream().anyMatch(lowerName::endsWith);
    }

    /**
     * 判断文件名是否属于可作为图片封面的格式。
     */
    private boolean isImageFile(String filename) {
        String lowerName = filename.toLowerCase();
        return IMAGE_EXT.stream().anyMatch(lowerName::endsWith);
    }

    /**
     * 将 Windows 反斜杠路径统一转换为 URL/前端使用的正斜杠路径。
     */
    private String normalizePath(String path) {
        return path.replace("\\", "/");
    }

    /**
     * 层级接口使用的章节预览数据。
     *
     * @param hasMedia 当前目录是否包含受支持媒体文件
     * @param totalFiles 当前目录内受支持媒体文件数量
     * @param firstImageFile 自然排序后的第一张图片文件名；纯视频/GIF 章节为空
     */
    public record ChapterPreview(boolean hasMedia, int totalFiles, Optional<String> firstImageFile) {
    }
}
