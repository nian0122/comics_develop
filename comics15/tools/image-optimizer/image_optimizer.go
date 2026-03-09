package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"github.com/chai2010/webp"
	"image"
	"image/jpeg"
	"image/png"
)


// 支持的图片扩展名
var supportedImageExtensions = []string{".jpg", ".jpeg", ".png", ".webp"}

// 目标 WebP 质量设置 (0-100)
const webpQuality float32 = 15.0

// 检查文件扩展名是否受支持
func isSupportedImage(filePath string) bool {
	ext := strings.ToLower(filepath.Ext(filePath))
	for _, supportedExt := range supportedImageExtensions {
		if ext == supportedExt {
			return true
		}
	}
	return false
}

// optimizeImageToWebP 加载图片，将其转换为低质量 WebP 格式并保存到目标路径。
// 这里只实现了对 JPG 和 PNG 的支持。
func optimizeImageToWebP(filePath string, outputPath string) bool {
	// 1. 打开图片文件
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("ERROR: Failed to open source file %s: %v\n", filePath, err)
		return false
	}
	defer file.Close()

	// 2. 解码图片
	var img image.Image
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(file)
	case ".png":
		img, err = png.Decode(file)
	default:
		// 虽然前面检查过，但这里再次确认以防万一
		fmt.Printf("WARNING: Skipping unsupported format %s\n", filePath)
		return false
	}

	if err != nil {
		fmt.Printf("ERROR: Failed to decode image %s: %v\n", filePath, err)
		return false
	}

	// 3. 确保输出目录存在
	outputDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("ERROR: Failed to create output directory %s: %v\n", outputDir, err)
		return false
	}

	// 4. 创建目标 WebP 文件
	outputFile, err := os.Create(outputPath)
	if err != nil {
		fmt.Printf("ERROR: Failed to create output file %s: %v\n", outputPath, err)
		return false
	}
	defer outputFile.Close()

	// 5. 保存为低质量 WebP
	options := webp.Options{
		Lossless: false,
		Quality: webpQuality,
	}
	
	if err := webp.Encode(outputFile, img, &options); err != nil {
		fmt.Printf("ERROR: Failed to encode WebP for %s: %v\n", filePath, err)
		return false
	}

	return true
}