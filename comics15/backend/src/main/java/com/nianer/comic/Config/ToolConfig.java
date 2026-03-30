package com.nianer.comic.Config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * 工具配置类
 * 配置外部工具的路径和参数
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "tool")
public class ToolConfig {

    /**
     * 工具根目录，默认为项目 tools 目录
     */
    private String rootDir = "tools";

    /**
     * 各工具的可执行文件路径映射
     * key: 工具名称
     * value: 可执行文件名（相对于 rootDir）
     */
    private Map<String, String> executables = new HashMap<>();

    /**
     * 获取工具的完整路径
     * @param toolName 工具名称
     * @return 可执行文件的绝对路径
     */
    public Path getToolPath(String toolName) {
        String executable = executables.get(toolName);
        if (executable == null) {
            // 默认查找工具目录下的 exe 文件
            executable = toolName + ".exe";
        }
        return Paths.get(rootDir, toolName, executable);
    }

    /**
     * 获取工具目录路径
     * @param toolName 工具名称
     * @return 工具目录的绝对路径
     */
    public Path getToolDir(String toolName) {
        return Paths.get(rootDir, toolName);
    }

    /**
     * 检查工具是否存在
     * @param toolName 工具名称
     * @return 是否存在
     */
    public boolean toolExists(String toolName) {
        Path toolPath = getToolPath(toolName);
        return toolPath.toFile().exists();
    }
}