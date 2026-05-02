package main

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"

	"github.com/chai2010/webp"
)

var supportedImageExtensions = []string{".jpg", ".jpeg", ".png", ".webp"}

func isSupportedImage(filePath string) bool {
	ext := strings.ToLower(filepath.Ext(filePath))
	for _, supportedExt := range supportedImageExtensions {
		if ext == supportedExt {
			return true
		}
	}
	return false
}

// OptimizeResult 包含优化结果信息
type OptimizeResult struct {
	InputSize  int64
	OutputSize int64
}

func optimizeImageToWebP(filePath string, outputPath string, quality float32) (OptimizeResult, error) {
	result := OptimizeResult{}

	// 获取源文件大小
	sourceInfo, err := os.Stat(filePath)
	if err != nil {
		return result, fmt.Errorf("获取源文件信息失败: %w", err)
	}
	result.InputSize = sourceInfo.Size()

	file, err := os.Open(filePath)
	if err != nil {
		return result, fmt.Errorf("打开源文件失败: %w", err)
	}
	defer file.Close()

	var img image.Image
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(file)
	case ".png":
		img, err = png.Decode(file)
	default:
		return result, fmt.Errorf("不支持的格式: %s", ext)
	}

	if err != nil {
		return result, fmt.Errorf("解码图片失败: %w", err)
	}

	outputDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return result, fmt.Errorf("创建输出目录失败: %w", err)
	}

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return result, fmt.Errorf("创建输出文件失败: %w", err)
	}
	defer outputFile.Close()

	options := &webp.Options{
		Lossless: false,
		Quality:  quality,
	}

	if err := webp.Encode(outputFile, img, options); err != nil {
		return result, fmt.Errorf("编码 WebP 失败: %w", err)
	}

	// 获取输出文件大小
	outputInfo, err := os.Stat(outputPath)
	if err != nil {
		return result, fmt.Errorf("获取输出文件信息失败: %w", err)
	}
	result.OutputSize = outputInfo.Size()

	return result, nil
}
