package com.nianer.comic.Config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "comic")
public class ComicConfig {
    private String rootDir;
    private String hqSubDir;
    private String lqSubDir;
    private long cacheExpiration;

    @PostConstruct
    public void init() {
        log.info("漫画配置初始化完成 - 根目录: {}, HQ子目录: {}, LQ子目录: {}, 缓存过期时间: {}秒",
                rootDir, hqSubDir, lqSubDir, cacheExpiration);
    }

    public Path getHqPath() {
        return Paths.get(rootDir, hqSubDir);
    }

    public Path getLqPath() {
        return Paths.get(rootDir, lqSubDir);
    }
}