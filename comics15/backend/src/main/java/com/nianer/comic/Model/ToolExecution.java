package com.nianer.comic.Model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ToolExecution {

    private String executionId;
    private String toolName;
    private ToolStatus status;
    private List<String> logs;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private int processedCount;
    private int skippedCount;
    private int errorCount;

    public enum ToolStatus {
        PENDING,
        RUNNING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public static ToolExecution create(String executionId, String toolName) {
        return ToolExecution.builder()
                .executionId(executionId)
                .toolName(toolName)
                .status(ToolStatus.PENDING)
                .logs(new ArrayList<>())
                .startTime(LocalDateTime.now())
                .processedCount(0)
                .skippedCount(0)
                .errorCount(0)
                .build();
    }

    public void addLog(String message) {
        if (logs != null) {
            logs.add(message);
        }
    }

    public void markRunning() {
        this.status = ToolStatus.RUNNING;
    }

    public void markCompleted() {
        this.status = ToolStatus.COMPLETED;
        this.endTime = LocalDateTime.now();
    }

    public void markFailed() {
        this.status = ToolStatus.FAILED;
        this.endTime = LocalDateTime.now();
    }

    public void markCancelled() {
        this.status = ToolStatus.CANCELLED;
        this.endTime = LocalDateTime.now();
    }

    public boolean isFinished() {
        return status == ToolStatus.COMPLETED 
                || status == ToolStatus.FAILED 
                || status == ToolStatus.CANCELLED;
    }

    public long getDurationSeconds() {
        if (startTime == null) return 0;
        LocalDateTime end = endTime != null ? endTime : LocalDateTime.now();
        return java.time.Duration.between(startTime, end).getSeconds();
    }
}