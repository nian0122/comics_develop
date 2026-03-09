package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const highQualityBaseDir = `F:\games\comics\h_photograph`
const lowQualityBaseDir = `F:\games\comics\l_photograph`
const lowQualityExtension = ".webp"

const numWorkers = 16 

// 用于存储处理结果的结构体
type processResult struct {
	processed bool
	skipped   bool
	err       error
}

// 定义待处理任务的结构体
type imageTask struct {
	highQualityPath string
	lowQualityPath  string
	relativePath    string // 用于打印日志
}

// worker 是一个协程函数，从 tasks 通道接收任务并执行图片处理
func worker(id int, tasks <-chan imageTask, results chan<- processResult) {
	for task := range tasks {
		// 3. 检查是否需要处理 (文件时间戳和存在性检查)
		hqInfo, err := os.Stat(task.highQualityPath)
		if err != nil {
			// 文件不存在或权限问题
			results <- processResult{err: fmt.Errorf("stat failed for HQ: %v", err)}
			continue
		}

		if hqInfo.Size() == 0 {
			fmt.Printf("SKIP ZERO SIZE: %s\n", task.relativePath)
			results <- processResult{skipped: true}
			continue
		}

		// 检查低质量文件是否存在
		lqInfo, err := os.Stat(task.lowQualityPath)

		if err == nil { // 低质量文件存在
			// 如果低质量文件比高质量文件新或一样新，则跳过
			if lqInfo.ModTime().Unix() >= hqInfo.ModTime().Unix() {
				results <- processResult{skipped: true}
				fmt.Printf("SKIP: %s\n", task.relativePath) 
				continue
			}
		} else if !os.IsNotExist(err) { // 存在其他错误 (不是文件不存在)
			// 处理文件时间戳获取失败的情况
			results <- processResult{err: fmt.Errorf("stat failed for LQ: %v", err)}
			continue
		}
		
		// 4. 执行图片处理
		fmt.Printf("WORKER %d PROCESS: %s\n", id, task.relativePath)

		if optimizeImageToWebP(task.highQualityPath, task.lowQualityPath) {
			results <- processResult{processed: true}
		} else {
			// optimizeImageToWebP 内部会打印具体的错误信息
			results <- processResult{err: fmt.Errorf("optimization failed")}
		}
	}
}

func main() {
	fmt.Println("--- 批量图片优化任务启动 ---")
	fmt.Printf("  源目录 (HQ): %s\n", highQualityBaseDir)
	fmt.Printf("  目标目录 (LQ): %s\n", lowQualityBaseDir)
	fmt.Printf("  并发工作者数量: %d\n", numWorkers)
	fmt.Println(strings.Repeat("-", 30))

	startTime := time.Now()
	
	// 检查源目录是否存在
	if _, err := os.Stat(highQualityBaseDir); os.IsNotExist(err) {
		fmt.Printf("FATAL: Source directory not found: %s\n", highQualityBaseDir)
		return
	}

	// 任务通道和结果通道
	tasks := make(chan imageTask)
	results := make(chan processResult)
	var wg sync.WaitGroup

	// 1. 启动并发工作者
	for i := 1; i <= numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			worker(workerID, tasks, results)
		}(i)
	}

	// 2. 启动文件扫描协程
	go func() {
		defer close(tasks) // 扫描完成后关闭任务通道

		// 递归遍历高质量目录下的所有文件
		err := filepath.Walk(highQualityBaseDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				// 打印错误并继续
				fmt.Printf("WARNING: Preventing traversal into %s: %v\n", path, err)
				return nil
			}
			
			if info.IsDir() {
				return nil // 跳过目录
			}

			if !isSupportedImage(path) {
				return nil // 跳过不支持的图片格式
			}

			// 构造当前路径相对于 BASE_DIR 的相对路径
			relativePath, err := filepath.Rel(highQualityBaseDir, path)
			if err != nil {
				fmt.Printf("ERROR: Failed to get relative path for %s: %v\n", path, err)
				return nil
			}

			// 构造低质量目标文件的完整路径
			// a. 移除原始扩展名
			baseFilename := strings.TrimSuffix(filepath.Base(relativePath), filepath.Ext(relativePath))
			// b. 构造低质量文件名 (使用 .webp 扩展名)
			lowQualityFilename := baseFilename + lowQualityExtension
			
			// c. 构造目标路径
			lowQualityDir := filepath.Join(lowQualityBaseDir, filepath.Dir(relativePath))
			lowQualityPath := filepath.Join(lowQualityDir, lowQualityFilename)

			// 将任务发送到任务通道
			tasks <- imageTask{
				highQualityPath: path,
				lowQualityPath:  lowQualityPath,
				relativePath:    relativePath,
			}
			
			return nil
		})

		if err != nil {
			fmt.Printf("ERROR: File traversal failed: %v\n", err)
		}
	}()

	// 3. 结果收集协程
	processedCount := 0
	skippedCount := 0
	errorCount := 0
	
	// 等待所有工作者完成 (任务通道关闭后)
	go func() {
		wg.Wait()
		close(results) // 所有工作完成后关闭结果通道
	}()

	// 监听结果通道
	for result := range results {
		if result.err != nil {
			errorCount++
		} else if result.processed {
			processedCount++
		} else if result.skipped {
			skippedCount++
		}
	}

	// 4. 打印结果
	endTime := time.Now()
	
	fmt.Println(strings.Repeat("-", 30))
	fmt.Println("--- 批量图片优化任务完成 ---")
	fmt.Printf("总耗时: %.2f 秒\n", endTime.Sub(startTime).Seconds())
	fmt.Printf("处理图片数量: %d\n", processedCount)
	fmt.Printf("跳过图片数量: %d\n", skippedCount)
	fmt.Printf("处理失败数量: %d\n", errorCount)
	fmt.Println(strings.Repeat("-", 30))
}