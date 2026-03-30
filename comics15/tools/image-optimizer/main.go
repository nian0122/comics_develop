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
	defaultHQDir      = "h_photograph"
	defaultLQDir      = "l_photograph"
	defaultWorkers    = 8
	defaultQuality    = 75
	defaultExtensions = ".jpg,.jpeg,.png,.gif,.bmp"
)

type Stats struct {
	Total     int32
	Processed int32
	Skipped   int32
	Failed    int32
}

type Config struct {
	ScanDir    string
	OutputDir  string
	HQDir      string
	LQDir      string
	Series     string
	Extensions map[string]bool
	Workers    int
	Quality    int
	Force      bool
	Quiet      bool
}

func main() {
	rootDir := flag.String("root", "", "漫画根目录")
	scanDir := flag.String("scan-dir", "", "自定义扫描目录 (覆盖 root+series)")
	hqSubDir := flag.String("hq", defaultHQDir, "HQ 子目录名")
	lqSubDir := flag.String("lq", defaultLQDir, "LQ 子目录名")
	series := flag.String("series", "", "指定系列名称")
	extensions := flag.String("ext", defaultExtensions, "文件扩展名，逗号分隔")
	workers := flag.Int("workers", defaultWorkers, "并发数")
	quality := flag.Int("quality", defaultQuality, "WebP 质量 (1-100)")
	force := flag.Bool("force", false, "强制重新处理")
	quiet := flag.Bool("quiet", false, "安静模式")
	flag.Parse()

	config := buildConfig(*rootDir, *scanDir, *hqSubDir, *lqSubDir, *series, *extensions, *workers, *quality, *force, *quiet)

	if config.ScanDir == "" {
		printUsage()
		os.Exit(1)
	}

	if _, err := os.Stat(config.ScanDir); os.IsNotExist(err) {
		fmt.Printf("错误: 目录不存在: %s\n", config.ScanDir)
		os.Exit(1)
	}

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
	fmt.Println("图片优化工具 - 将图片转换为 WebP 格式")
	fmt.Println()
	fmt.Println("用法: image-optimizer.exe [选项]")
	fmt.Println()
	fmt.Println("选项:")
	flag.PrintDefaults()
	fmt.Println()
	fmt.Println("示例:")
	fmt.Println("  # 使用 root + series")
	fmt.Println("  image-optimizer.exe -root \"F:\\games\\comics\" -series \"MySeries\"")
	fmt.Println()
	fmt.Println("  # 使用自定义扫描目录")
	fmt.Println("  image-optimizer.exe -scan-dir \"F:\\games\\comics\\h_photograph\\MySeries\"")
}

func buildConfig(rootDir, scanDir, hqSubDir, lqSubDir, series, extensions string, workers, quality int, force, quiet bool) *Config {
	extSet := make(map[string]bool)
	for _, ext := range strings.Split(extensions, ",") {
		ext = strings.ToLower(strings.TrimSpace(ext))
		if ext != "" {
			extSet[ext] = true
		}
	}

	config := &Config{
		Extensions: extSet,
		Workers:    workers,
		Quality:    quality,
		Force:      force,
		Quiet:      quiet,
		Series:     series,
	}

	if scanDir != "" {
		config.ScanDir = scanDir
		config.OutputDir = strings.Replace(scanDir, hqSubDir, lqSubDir, 1)
		config.HQDir = scanDir
		config.LQDir = config.OutputDir
	} else if rootDir != "" {
		config.HQDir = filepath.Join(rootDir, hqSubDir)
		config.LQDir = filepath.Join(rootDir, lqSubDir)
		if series != "" {
			config.ScanDir = filepath.Join(config.HQDir, series)
			config.OutputDir = filepath.Join(config.LQDir, series)
		} else {
			config.ScanDir = config.HQDir
			config.OutputDir = config.LQDir
		}
	}

	return config
}

func printHeader(config *Config) {
	fmt.Println(strings.Repeat("-", 50))
	fmt.Println("--- 图片优化工具 ---")
	fmt.Printf("扫描目录: %s\n", config.ScanDir)
	fmt.Printf("输出目录: %s\n", config.OutputDir)
	fmt.Printf("并发数:   %d\n", config.Workers)
	fmt.Printf("质量:     %d\n", config.Quality)
	if config.Force {
		fmt.Println("模式:     强制重新处理")
	}
	fmt.Println(strings.Repeat("-", 50))
}

func run(config *Config, stats *Stats) {
	tasks := make(chan imageTask, config.Workers*2)
	var wg sync.WaitGroup

	for i := 0; i < config.Workers; i++ {
		wg.Add(1)
		go worker(i, tasks, &wg, config, stats)
	}

	filepath.Walk(config.ScanDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if !config.Quiet {
				fmt.Printf("WARN: 无法访问 %s: %v\n", path, err)
			}
			return nil
		}

		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if !config.Extensions[ext] {
			return nil
		}

		if info.Size() == 0 {
			atomic.AddInt32(&stats.Skipped, 1)
			return nil
		}

		relPath, err := filepath.Rel(config.ScanDir, path)
		if err != nil {
			return nil
		}

		baseFilename := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		lqPath := filepath.Join(config.OutputDir, filepath.Dir(relPath), baseFilename+".webp")

		atomic.AddInt32(&stats.Total, 1)

		if !config.Force {
			if lqInfo, err := os.Stat(lqPath); err == nil {
				if lqInfo.ModTime().Unix() >= info.ModTime().Unix() {
					atomic.AddInt32(&stats.Skipped, 1)
					return nil
				}
			}
		}

		tasks <- imageTask{
			HQPath:       path,
			LQPath:       lqPath,
			RelativePath: relPath,
		}
		return nil
	})

	close(tasks)
	wg.Wait()
}

type imageTask struct {
	HQPath       string
	LQPath       string
	RelativePath string
}

func worker(id int, tasks <-chan imageTask, wg *sync.WaitGroup, config *Config, stats *Stats) {
	defer wg.Done()

	for task := range tasks {
		err := processImage(task.HQPath, task.LQPath, config.Quality)

		if err != nil {
			atomic.AddInt32(&stats.Failed, 1)
			if !config.Quiet {
				fmt.Printf("FAIL: %s - %v\n", filepath.Base(task.HQPath), err)
			}
		} else {
			atomic.AddInt32(&stats.Processed, 1)
			if !config.Quiet {
				fmt.Printf("OK: %s\n", filepath.Base(task.RelativePath))
			}
		}
	}
}

func processImage(hqPath, lqPath string, quality int) error {
	lqDir := filepath.Dir(lqPath)
	if err := os.MkdirAll(lqDir, 0755); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	webpQuality := float32(quality)
	return optimizeImageToWebP(hqPath, lqPath, webpQuality)
}

func printFooter(stats *Stats, duration time.Duration) {
	fmt.Println(strings.Repeat("-", 50))
	fmt.Println("--- 任务完成 ---")
	fmt.Printf("总耗时:   %.2f 秒\n", duration.Seconds())
	fmt.Printf("扫描文件: %d\n", stats.Total)
	fmt.Printf("处理成功: %d\n", stats.Processed)
	fmt.Printf("跳过文件: %d\n", stats.Skipped)
	fmt.Printf("失败数量: %d\n", stats.Failed)
	if duration.Seconds() > 0 {
		fmt.Printf("平均速度: %.0f 文件/秒\n", float64(stats.Processed)/duration.Seconds())
	}
	fmt.Println(strings.Repeat("-", 50))
}

func init() {
	runtime.GOMAXPROCS(runtime.NumCPU())
}
