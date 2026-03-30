package com.nianer.comic.Controller;

import com.nianer.comic.Model.ToolExecution;
import com.nianer.comic.Service.ToolExecutor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/tools")
@Tag(name = "工具管理接口", description = "执行和管理外部工具")
public class ToolController {

    @Autowired
    private ToolExecutor toolExecutor;

    private static final List<Map<String, Object>> AVAILABLE_TOOLS = Arrays.asList(
            Map.of(
                    "name", "image-optimizer",
                    "displayName", "图片优化器",
                    "description", "将 HQ 图片转换为 LQ WebP 格式",
                    "params", Arrays.asList(
                            Map.of("key", "series", "label", "系列名称", "type", "select", "required", false, "default", "")
                    )
            ),
            Map.of(
                    "name", "replace_files_with_empty",
                    "displayName", "清空文件内容",
                    "description", "删除指定目录文件并创建空文件占位",
                    "params", Arrays.asList(
                            Map.of("key", "dir", "label", "目标目录", "type", "text", "required", true, "default", ""),
                            Map.of("key", "ext", "label", "扩展名过滤", "type", "text", "required", false, "default", ".jpg,.jpeg,.png,.gif,.bmp"),
                            Map.of("key", "workers", "label", "并发数", "type", "number", "required", false, "default", "4")
                    )
            )
    );

    @Operation(summary = "获取可用工具列表", description = "返回所有可执行工具及其参数配置")
    @ApiResponse(responseCode = "200", description = "请求成功")
    @GetMapping
    public List<Map<String, Object>> listTools() {
        log.info("获取工具列表");
        return AVAILABLE_TOOLS;
    }

    @Operation(summary = "执行工具", description = "异步执行指定工具并返回执行 ID")
    @ApiResponse(responseCode = "200", description = "执行成功启动")
    @ApiResponse(responseCode = "400", description = "参数错误或工具不存在")
    @PostMapping("/{toolName}/execute")
    public ResponseEntity<Map<String, String>> executeTool(
            @Parameter(description = "工具名称", required = true) @PathVariable String toolName,
            @RequestBody(required = false) Map<String, String> params) throws IOException {

        log.info("执行工具: {}, 参数: {}", toolName, params);

        boolean validTool = AVAILABLE_TOOLS.stream()
                .anyMatch(t -> t.get("name").equals(toolName));
        if (!validTool) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "工具不存在: " + toolName));
        }

        if (params == null) {
            params = new HashMap<>();
        }

        String executionId = toolExecutor.execute(toolName, params);
        log.info("工具执行已启动, ID: {}", executionId);

        return ResponseEntity.ok(Map.of(
                "executionId", executionId,
                "toolName", toolName,
                "message", "执行已启动"
        ));
    }

    @Operation(summary = "获取执行状态", description = "查询指定执行的进度、日志和结果")
    @ApiResponse(responseCode = "200", description = "请求成功")
    @ApiResponse(responseCode = "404", description = "执行记录不存在")
    @GetMapping("/status/{executionId}")
    public ResponseEntity<ToolExecution> getExecutionStatus(
            @Parameter(description = "执行 ID", required = true) @PathVariable String executionId) {

        ToolExecution execution = toolExecutor.getExecution(executionId);
        if (execution == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(execution);
    }

    @Operation(summary = "获取所有执行记录", description = "返回当前所有执行记录（包括已完成）")
    @ApiResponse(responseCode = "200", description = "请求成功")
    @GetMapping("/executions")
    public Map<String, ToolExecution> getAllExecutions() {
        return toolExecutor.getAllExecutions();
    }

    @Operation(summary = "取消执行", description = "取消正在运行的工具执行")
    @ApiResponse(responseCode = "200", description = "取消成功")
    @ApiResponse(responseCode = "404", description = "执行记录不存在")
    @PostMapping("/cancel/{executionId}")
    public ResponseEntity<Map<String, String>> cancelExecution(
            @Parameter(description = "执行 ID", required = true) @PathVariable String executionId) {

        ToolExecution execution = toolExecutor.getExecution(executionId);
        if (execution == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "执行记录不存在"));
        }

        if (execution.isFinished()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "执行已完成，无法取消"));
        }

        toolExecutor.cancel(executionId);
        return ResponseEntity.ok(Map.of("message", "执行已取消"));
    }

    @Operation(summary = "清理已完成记录", description = "删除所有已完成的执行记录")
    @ApiResponse(responseCode = "200", description = "清理成功")
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, String>> cleanupExecutions() {
        toolExecutor.clearCompleted();
        return ResponseEntity.ok(Map.of("message", "已完成记录已清理"));
    }
}