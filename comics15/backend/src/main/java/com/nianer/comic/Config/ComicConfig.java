package com.nianer.comic.Config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import java.nio.file.Path;
import java.nio.file.Paths;

@Data
@Configuration
@ConfigurationProperties(prefix = "comic")
public class ComicConfig {
    private String rootDir;
    private String hqSubDir;
    private String lqSubDir;
    private long cacheExpiration;

    public Path getHqPath() {
        return Paths.get(rootDir, hqSubDir);
    }

    public Path getLqPath() {
        return Paths.get(rootDir, lqSubDir);
    }
}