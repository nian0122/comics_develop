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

    public List<String> listSupportedMediaFiles(Path chapterPath) throws IOException {
        try (Stream<Path> stream = Files.list(chapterPath)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(p -> p.getFileName().toString())
                    .filter(this::isSupportedMediaFile)
                    .sorted(this::naturalCompare)
                    .collect(Collectors.toList());
        }
    }

    public List<Path> listSortedSubDirectories(Path directory) throws IOException {
        try (Stream<Path> list = Files.list(directory)) {
            return list.filter(Files::isDirectory)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), this::naturalCompare))
                    .collect(Collectors.toList());
        }
    }

    public Map<String, Object> buildChapterFilesResponse(String chapterPath, List<Map<String, Object>> filesMetadata) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", chapterPath);
        response.put("files", filesMetadata);
        response.put("total", filesMetadata.size());
        return response;
    }

    public Map<String, Object> buildChapterFilesResponse(String seriesName, String chapterPath, Path chapterPathResolved, List<String> files) throws IOException {
        List<Map<String, Object>> filesMetadata = new ArrayList<>();
        for (String filename : files) {
            filesMetadata.add(buildFileMetadata(seriesName, chapterPath, chapterPathResolved, filename));
        }
        return buildChapterFilesResponse(chapterPath, filesMetadata);
    }

    public Map<String, String> buildChapterData(String seriesName, String relativePath, List<String> mediaFiles) {
        String normalizedPath = normalizePath(relativePath);
        Map<String, String> chapterData = new HashMap<>();
        chapterData.put("path_id", normalizedPath);
        chapterData.put("name", normalizedPath.isEmpty() ? seriesName : Path.of(normalizedPath).getFileName().toString());
        chapterData.put("total_files", String.valueOf(mediaFiles.size()));

        Optional<String> coverFile = mediaFiles.stream().filter(this::isImageFile).findFirst();
        if (coverFile.isPresent()) {
            chapterData.put("cover_file", coverFile.get());
            chapterData.put("cover_source", resolveCoverSource(seriesName, normalizedPath, coverFile.get()));
        }
        return chapterData;
    }

    public Map<String, Object> buildDirectoryNode(Path directory, String name, String relativePath) throws IOException {
        Map<String, Object> node = new HashMap<>();
        node.put("type", "directory");
        node.put("name", name);
        node.put("path", relativePath);
        node.put("has_children", hasChildDirectories(directory));
        return node;
    }

    public Map<String, Object> buildLevelChapterNode(String seriesName, String name, String relativePath, List<String> mediaFiles) {
        Map<String, Object> node = new HashMap<>();
        String normalizedPath = normalizePath(relativePath);
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

    public Map<String, Object> buildLevelResponse(String decodedPath, List<Map<String, Object>> nodes) {
        Map<String, Object> response = new HashMap<>();
        response.put("path", decodedPath);
        response.put("nodes", nodes);
        return response;
    }

    public int naturalCompare(String s1, String s2) {
        return CaseInsensitiveSimpleNaturalComparator.getInstance().compare(s1, s2);
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
        return normalizePath(fullPath);
    }

    private boolean hasChildDirectories(Path directory) throws IOException {
        try (Stream<Path> stream = Files.list(directory)) {
            return stream.anyMatch(Files::isDirectory);
        }
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

    private String normalizePath(String path) {
        return path.replace("\\", "/");
    }
}
