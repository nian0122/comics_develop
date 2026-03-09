package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	// 默认支持的文件扩展名
	defaultExtensions = ".jpg,.jpeg,.png,.gif,.bmp"
	// 默认并发数
	defaultWorkers = 4
)

// 任务结构体
type fileTask struct {
	path     string
	filename string
	dirpath  string
}

// 处理结果
type processResult struct {
	processed bool
	err       error
}

// worker 协程
func worker(id int, tasks <-chan fileTask, results chan<- processResult, sem chan struct{}) {
	for task := range tasks {
		<-sem // 获取信号量，控制并发

		go func(t fileTask) {
			defer func() { sem <- struct{}{} }() // 释放信号量

			err := os.Remove(t.path)
			if err != nil {
				results <- processResult{err: fmt.Errorf("删除文件失败: %v", err)}
				return
			}

			// 创建空文件
			f, err := os.Create(t.path)
			if err != nil {
				results <- processResult{err: fmt.Errorf("创建空文件失败: %v", err)}
				return
			}
			f.Close()

			results <- processResult{processed: true}
		}(task)
	}
}

func main() {
	// 命令行参数
	targetDir := flag.String("dir", "", "要处理的根目录路径 (必填)")
	extensions := flag.String("ext", defaultExtensions, "要处理的文件扩展名，用逗号分隔")
	workers := flag.Int("workers", defaultWorkers, "并发 worker 数量")
	flag.Parse()

	if *targetDir == "" {
		fmt.Println("错误: 请通过 -dir 参数指定要处理的根目录")
		fmt.Println("用法: clean_files -dir /path/to/directory [-ext .jpg,.png] [-workers 16]")
		os.Exit(1)
	}

	// 验证目录存在
	if _, err := os.Stat(*targetDir); os.IsNotExist(err) {
		fmt.Printf("错误: 目录不存在: %s\n", *targetDir)
		os.Exit(1)
	}

	// 解析扩展名
	extList := strings.Split(*extensions, ",")
	for i := range extList {
		extList[i] = strings.ToLower(strings.TrimSpace(extList[i]))
	}
	extSet := make(map[string]bool)
	for _, ext := range extList {
		extSet[ext] = true
	}

	fmt.Printf("--- 批量文件清空任务启动 ---\n")
	fmt.Printf("  根目录: %s\n", *targetDir)
	fmt.Printf("  扩展名: %s\n", *extensions)
	fmt.Printf("  并发数: %d\n", *workers)
	fmt.Println(strings.Repeat("-", 40))

	startTime := time.Now()

	// 创建信号量控制并发
	sem := make(chan struct{}, *workers)
	for i := 0; i < *workers; i++ {
		sem <- struct{}{} // 初始化信号量
	}

	// 任务和结果通道
	tasks := make(chan fileTask, 1000)
	results := make(chan processResult, 1000)

	// 启动 workers
	var wg sync.WaitGroup
	for i := 1; i <= *workers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			worker(workerID, tasks, results, sem)
		}(i)
	}

	// 启动文件扫描协程
	go func() {
		defer close(tasks)

		err := filepath.Walk(*targetDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				fmt.Printf("警告: 无法访问 %s: %v\n", path, err)
				return nil
			}

			if info.IsDir() {
				return nil
			}

			// 检查扩展名
			ext := strings.ToLower(filepath.Ext(path))
			if !extSet[ext] {
				return nil
			}

			tasks <- fileTask{
				path:     path,
				filename: info.Name(),
				dirpath:  filepath.Dir(path),
			}

			return nil
		})

		if err != nil {
			fmt.Printf("错误: 目录遍历失败: %v\n", err)
		}
	}()

	// 等待 workers 完成
	go func() {
		wg.Wait()
		close(results)
	}()

	// 收集结果
	processedCount := 0
	errorCount := 0

	for result := range results {
		if result.err != nil {
			errorCount++
			fmt.Printf("❌ %v\n", result.err)
		} else if result.processed {
			processedCount++
		}
	}

	endTime := time.Now()

	fmt.Println(strings.Repeat("-", 40))
	fmt.Println("--- 批量文件清空任务完成 ---")
	fmt.Printf("总耗时: %.2f 秒\n", endTime.Sub(startTime).Seconds())
	fmt.Printf("处理文件数: %d\n", processedCount)
	fmt.Printf("失败数量: %d\n", errorCount)
	fmt.Println(strings.Repeat("-", 40))
}
