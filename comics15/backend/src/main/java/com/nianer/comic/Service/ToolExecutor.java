package com.nianer.comic.Service;

import com.nianer.comic.Config.ComicConfig;
import com.nianer.comic.Config.ToolConfig;
import com.nianer.comic.Model.ToolExecution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class ToolExecutor {

    @Autowired
    private ToolConfig toolConfig;

    @Autowired
    private ComicConfig comicConfig;

    private final Map<String, ToolExecution> executions = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 获取所有执行记录
     */
    public Map<String, ToolExecution> getAllExecutions() {
        return executions;
    }

    /**
     * 获取指定执行记录
     */
    public ToolExecution getExecution(String executionId) {
        return executions.get(executionId);
    }

    /**
     * 执行工具
     * @param toolName 工具名称
     * @param params 执行参数
     * @return 执行 ID
     */
    public String execute(String toolName, Map<String, String> params) throws IOException {
        String executionId = UUID.randomUUID().toString().substring(0, 8);
        ToolExecution execution = ToolExecution.create(executionId, toolName);
        executions.put(executionId, execution);

        executorService.submit(() -> runTool(execution, toolName, params));

        return executionId;
    }

    private void runTool(ToolExecution execution, String toolName, Map<String, String> params) {
        try {
            execution.markRunning();
            execution.addLog("开始执行工具: " + toolName);

            Path toolPath = resolveToolPath(toolName);
            if (!Files.exists(toolPath)) {
                execution.addLog("错误: 工具不存在 - " + toolPath);
                execution.markFailed();
                return;
            }

            ProcessBuilder pb = buildProcess(toolName, toolPath, params);
            pb.redirectErrorStream(true);

            execution.addLog("执行命令: " + pb.command());
            execution.addLog("工作目录: " + pb.directory());

            Process process = pb.start();

            readOutputAsync(process, execution);

            int exitCode = process.waitFor();

            if (exitCode == 0) {
                execution.addLog("工具执行完成，退出码: " + exitCode);
                execution.markCompleted();
            } else {
                execution.addLog("工具执行失败，退出码: " + exitCode);
                execution.markFailed();
            }

        } catch (Exception e) {
            log.error("工具执行异常: {}", e.getMessage(), e);
            execution.addLog("执行异常: " + e.getMessage());
            execution.markFailed();
        }
    }

    private Path resolveToolPath(String toolName) {
        if ("image-optimizer".equals(toolName)) {
            String os = System.getProperty("os.name").toLowerCase();
            String exeName = os.contains("win") ? "image-optimizer-go4.exe" : "image-optimizer";
            return toolConfig.getToolDir(toolName).resolve(exeName);
        }
        if ("replace_files_with_empty".equals(toolName)) {
            String os = System.getProperty("os.name").toLowerCase();
            String exeName = os.contains("win") ? "clean_files.exe" : "clean_files";
            return toolConfig.getToolDir(toolName).resolve(exeName);
        }
        return toolConfig.getToolPath(toolName);
    }

    private ProcessBuilder buildProcess(String toolName, Path toolPath, Map<String, String> params) {
        List<String> command = new java.util.ArrayList<>();
        command.add(toolPath.toString());

        if ("replace_files_with_empty".equals(toolName)) {
            String targetDir = params.getOrDefault("dir", comicConfig.getRootDir());
            command.add("-dir");
            command.add(targetDir);

            String ext = params.get("ext");
            if (ext != null && !ext.isEmpty()) {
                command.add("-ext");
                command.add(ext);
            }

            String workers = params.get("workers");
            if (workers != null && !workers.isEmpty()) {
                command.add("-workers");
                command.add(workers);
            }
        }

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(toolPath.getParent().toFile());

        return pb;
    }

    private void readOutputAsync(Process process, ToolExecution execution) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                execution.addLog(line);
                parseProgress(line, execution);
            }
        } catch (IOException e) {
            log.error("读取输出流失败: {}", e.getMessage());
            execution.addLog("读取输出失败: " + e.getMessage());
        }
    }

    private void parseProgress(String line, ToolExecution execution) {
        if (line.contains("处理") && line.contains("数量")) {
            try {
                if (line.contains("处理图片数量") || line.contains("处理文件数")) {
                    String numStr = line.replaceAll("[^0-9]", "");
                    if (!numStr.isEmpty()) {
                        execution.setProcessedCount(Integer.parseInt(numStr));
                    }
                }
                if (line.contains("跳过图片数量") || line.contains("跳过")) {
                    String numStr = line.replaceAll("[^0-9]", "");
                    if (!numStr.isEmpty()) {
                        execution.setSkippedCount(Integer.parseInt(numStr));
                    }
                }
                if (line.contains("处理失败数量") || line.contains("失败数量")) {
                    String numStr = line.replaceAll("[^0-9]", "");
                    if (!numStr.isEmpty()) {
                        execution.setErrorCount(Integer.parseInt(numStr));
                    }
                }
            } catch (NumberFormatException ignored) {
            }
        }
    }

    public void cancel(String executionId) {
        ToolExecution execution = executions.get(executionId);
        if (execution != null && !execution.isFinished()) {
            execution.markCancelled();
            execution.addLog("用户取消执行");
        }
    }

    public void clearCompleted() {
        executions.entrySet().removeIf(e -> e.getValue().isFinished());
    }
}