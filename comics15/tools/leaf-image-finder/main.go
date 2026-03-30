package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const (
	defaultExtensions = ".jpg,.jpeg,.png,.webp,.gif,.bmp"
)

var supportedExtensions []string

type LeafImage struct {
	LeafDir   string `json:"leafDir"`
	ImagePath string `json:"imagePath"`
	ImageName string `json:"imageName"`
}

func main() {
	targetDir := flag.String("dir", "", "目标根目录路径 (必填)")
	extensions := flag.String("ext", defaultExtensions, "支持的图片扩展名，逗号分隔")
	outputJSON := flag.Bool("json", false, "输出 JSON 格式")
	flag.Parse()

	if *targetDir == "" {
		fmt.Println("错误: 请通过 -dir 参数指定目标目录")
		fmt.Println("用法: leaf-image-finder -dir /path/to/directory [-ext .jpg,.png] [-json]")
		os.Exit(1)
	}

	if _, err := os.Stat(*targetDir); os.IsNotExist(err) {
		fmt.Printf("错误: 目录不存在: %s\n", *targetDir)
		os.Exit(1)
	}

	extList := strings.Split(*extensions, ",")
	supportedExtensions = make([]string, len(extList))
	for i, ext := range extList {
		supportedExtensions[i] = strings.ToLower(strings.TrimSpace(ext))
	}

	fmt.Printf("--- 叶目录图片查找任务启动 ---\n")
	fmt.Printf("  根目录: %s\n", *targetDir)
	fmt.Printf("  扩展名: %s\n", *extensions)
	outputFormat := "文本"
	if *outputJSON {
		outputFormat = "JSON"
	}
	fmt.Printf("  输出格式: %s\n", outputFormat)
	fmt.Println(strings.Repeat("-", 40))

	results := findLeafImages(*targetDir)

	if *outputJSON {
		outputJSONResults(results)
	} else {
		outputTextResults(results)
	}

	fmt.Println(strings.Repeat("-", 40))
	fmt.Printf("--- 查找完成，共 %d 个叶目录 ---\n", len(results))
}

func findLeafImages(rootDir string) []LeafImage {
	var results []LeafImage

	filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			fmt.Printf("警告: 无法访问 %s: %v\n", path, err)
			return nil
		}

		if !info.IsDir() {
			return nil
		}

		if isLeafDir(path) {
			firstImage := findFirstImage(path)
			if firstImage != "" {
				relDir, _ := filepath.Rel(rootDir, path)
				relImage, _ := filepath.Rel(rootDir, firstImage)
				results = append(results, LeafImage{
					LeafDir:   relDir,
					ImagePath: relImage,
					ImageName: filepath.Base(firstImage),
				})
				fmt.Printf("叶目录: %s -> %s\n", relDir, filepath.Base(firstImage))
			}
		}

		return nil
	})

	sort.Slice(results, func(i, j int) bool {
		return naturalCompare(results[i].LeafDir, results[j].LeafDir) < 0
	})

	return results
}

func isLeafDir(dirPath string) bool {
	files, err := os.ReadDir(dirPath)
	if err != nil {
		return false
	}

	for _, file := range files {
		if file.IsDir() {
			return false
		}
	}
	return true
}

func findFirstImage(dirPath string) string {
	files, err := os.ReadDir(dirPath)
	if err != nil {
		return ""
	}

	var imageFiles []string
	for _, file := range files {
		if !file.IsDir() {
			ext := strings.ToLower(filepath.Ext(file.Name()))
			for _, supported := range supportedExtensions {
				if ext == supported {
					imageFiles = append(imageFiles, file.Name())
					break
				}
			}
		}
	}

	if len(imageFiles) == 0 {
		return ""
	}

	sort.Slice(imageFiles, func(i, j int) bool {
		return naturalCompare(imageFiles[i], imageFiles[j]) < 0
	})

	return filepath.Join(dirPath, imageFiles[0])
}

func naturalCompare(s1, s2 string) int {
	i1, i2 := 0, 0
	n1, n2 := len(s1), len(s2)

	for i1 < n1 && i2 < n2 {
		c1, c2 := s1[i1], s2[i2]

		if c1 >= '0' && c1 <= '9' && c2 >= '0' && c2 <= '9' {
			num1, num2 := extractNumber(s1, &i1), extractNumber(s2, &i2)
			if num1 != num2 {
				return num1 - num2
			}
			continue
		}

		lower1, lower2 := strings.ToLower(string(c1)), strings.ToLower(string(c2))
		if lower1 != lower2 {
			if lower1 < lower2 {
				return -1
			}
			return 1
		}

		i1++
		i2++
	}

	return n1 - n2
}

func extractNumber(s string, idx *int) int {
	num := 0
	for *idx < len(s) && s[*idx] >= '0' && s[*idx] <= '9' {
		num = num*10 + int(s[*idx]-'0')
		*idx++
	}
	return num
}

func outputJSONResults(results []LeafImage) {
	jsonData, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		fmt.Printf("错误: JSON 编码失败: %v\n", err)
		return
	}
	fmt.Println(string(jsonData))
}

func outputTextResults(results []LeafImage) {
	for _, r := range results {
		fmt.Printf("%s|%s\n", r.LeafDir, r.ImagePath)
	}
}
