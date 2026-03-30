package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	defaultExtensions = ".jpg,.jpeg,.png,.gif,.bmp,.webp"
	defaultWorkers    = 8
)

type Stats struct {
	Total     int32
	Processed int32
	Skipped   int32
	Failed    int32
}

type Config struct {
	TargetDir   string
	Extensions  map[string]bool
	Workers     int
	DryRun      bool
	MinSize     int64
	ExcludeDirs []string
	Quiet       bool
}

func main() {
	targetDir := flag.String("dir", "", "目标目录路径 (必填)")
	extensions := flag.String("ext", defaultExtensions, "文件扩展名，逗号分隔")
	workers := flag.Int("workers", defaultWorkers, "并发数")
	dryRun := flag.Bool("dry-run", false, "干跑模式，只显示不执行")
	minSize := flag.Int64("min-size", 0, "最小文件大小(字节)，默认0表示全部")
	exclude := flag.String("exclude", "", "排除的目录名，逗号分隔")
	quiet := flag.Bool("quiet", false, "安静模式，只输出结果")
	flag.Parse()

	if *targetDir == "" {
		printUsage()
		os.Exit(1)
	}

	if _, err := os.Stat(*targetDir); os.IsNotExist(err) {
		fmt.Printf("错误: 目录不存在: %s\n", *targetDir)
		os.Exit(1)
	}

	config := buildConfig(*targetDir, *extensions, *workers, *dryRun, *minSize, *exclude, *quiet)

	if !config.Quiet {
		printHeader(config)
	}

	stats := &Stats{}
	startTime := time.Now()

	run(config, stats)

	duration := time.Since(startTime)

	if !config.Quiet {
		printFooter(stats, duration)
	} else {
		fmt.Printf("processed=%d,skipped=%d,failed=%d\n",
			stats.Processed, stats.Skipped, stats.Failed)
	}
}

func printUsage() {
	fmt.Println("清空文件内容工具 - 将文件截断为0字节")
	fmt.Println()
	fmt.Println("用法: clean_files.exe -dir <目录> [选项]")
	fmt.Println()
	fmt.Println("选项:")
	flag.PrintDefaults()
	fmt.Println()
	fmt.Println("示例:")
	fmt.Println("  clean_files.exe -dir \"F:\\comics\\series\"")
	fmt.Println("  clean_files.exe -dir \"F:\\comics\" -ext \".jpg,.png\" -workers 16")
	fmt.Println("  clean_files.exe -dir \"F:\\comics\" -dry-run")
	fmt.Println("  clean_files.exe -dir \"F:\\comics\" -min-size 1024 -exclude \"backup,tmp\"")
}

func buildConfig(targetDir, extensions string, workers int, dryRun bool, minSize int64, exclude string, quiet bool) *Config {
	extSet := make(map[string]bool)
	for _, ext := range strings.Split(extensions, ",") {
		ext = strings.ToLower(strings.TrimSpace(ext))
		if ext != "" {
			extSet[ext] = true
		}
	}

	var excludeDirs []string
	for _, dir := range strings.Split(exclude, ",") {
		dir = strings.TrimSpace(dir)
		if dir != "" {
			excludeDirs = append(excludeDirs, strings.ToLower(dir))
		}
	}

	return &Config{
		TargetDir:   targetDir,
		Extensions:  extSet,
		Workers:     workers,
		DryRun:      dryRun,
		MinSize:     minSize,
		ExcludeDirs: excludeDirs,
		Quiet:       quiet,
	}
}

func printHeader(config *Config) {
	fmt.Println(strings.Repeat("-", 50))
	fmt.Println("--- 文件清空工具 ---")
	fmt.Printf("目标目录: %s\n", config.TargetDir)
	fmt.Printf("文件类型: %s\n", formatExtensions(config.Extensions))
	fmt.Printf("并发数:   %d\n", config.Workers)
	if config.DryRun {
		fmt.Println("模式:     干跑 (仅预览)")
	}
	if config.MinSize > 0 {
		fmt.Printf("最小大小: %d 字节\n", config.MinSize)
	}
	if len(config.ExcludeDirs) > 0 {
		fmt.Printf("排除目录: %s\n", strings.Join(config.ExcludeDirs, ", "))
	}
	fmt.Println(strings.Repeat("-", 50))
}

func formatExtensions(extSet map[string]bool) string {
	var exts []string
	for ext := range extSet {
		exts = append(exts, ext)
	}
	return strings.Join(exts, ",")
}

func run(config *Config, stats *Stats) {
	tasks := make(chan string, config.Workers*2)
	var wg sync.WaitGroup

	for i := 0; i < config.Workers; i++ {
		wg.Add(1)
		go worker(i, tasks, &wg, config, stats)
	}

	filepath.Walk(config.TargetDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if !config.Quiet {
				fmt.Printf("WARN: 无法访问 %s: %v\n", path, err)
			}
			return nil
		}

		if info.IsDir() {
			if shouldExcludeDir(info.Name(), config.ExcludeDirs) {
				return filepath.SkipDir
			}
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if !config.Extensions[ext] {
			return nil
		}

		if config.MinSize > 0 && info.Size() < config.MinSize {
			atomic.AddInt32(&stats.Skipped, 1)
			return nil
		}

		if info.Size() == 0 {
			atomic.AddInt32(&stats.Skipped, 1)
			return nil
		}

		atomic.AddInt32(&stats.Total, 1)
		tasks <- path
		return nil
	})

	close(tasks)
	wg.Wait()
}

func shouldExcludeDir(name string, excludeDirs []string) bool {
	nameLower := strings.ToLower(name)
	for _, exclude := range excludeDirs {
		if nameLower == exclude {
			return true
		}
	}
	return false
}

func worker(id int, tasks <-chan string, wg *sync.WaitGroup, config *Config, stats *Stats) {
	defer wg.Done()

	for path := range tasks {
		err := processFile(path, config)

		if err != nil {
			atomic.AddInt32(&stats.Failed, 1)
			if !config.Quiet {
				fmt.Printf("FAIL: %s - %v\n", filepath.Base(path), err)
			}
		} else {
			atomic.AddInt32(&stats.Processed, 1)
			if !config.Quiet && config.DryRun {
				fmt.Printf("DRY: %s\n", filepath.Base(path))
			}
		}
	}
}

func processFile(path string, config *Config) error {
	if config.DryRun {
		return nil
	}

	file, err := os.OpenFile(path, os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("打开失败: %w", err)
	}
	defer file.Close()

	return nil
}

func printFooter(stats *Stats, duration time.Duration) {
	fmt.Println(strings.Repeat("-", 50))
	fmt.Println("--- 任务完成 ---")
	fmt.Printf("总耗时:   %.2f 秒\n", duration.Seconds())
	fmt.Printf("扫描文件: %d\n", stats.Total)
	fmt.Printf("处理成功: %d\n", stats.Processed)
	fmt.Printf("跳过文件: %d\n", stats.Skipped)
	fmt.Printf("失败数量: %d\n", stats.Failed)
	fmt.Printf("平均速度: %.0f 文件/秒\n", float64(stats.Processed)/duration.Seconds())
	fmt.Println(strings.Repeat("-", 50))
}

func init() {
	runtime.GOMAXPROCS(runtime.NumCPU())
}
