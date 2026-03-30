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

func optimizeImageToWebP(filePath string, outputPath string, quality float32) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("打开源文件失败: %w", err)
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
		return fmt.Errorf("不支持的格式: %s", ext)
	}

	if err != nil {
		return fmt.Errorf("解码图片失败: %w", err)
	}

	outputDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("创建输出目录失败: %w", err)
	}

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("创建输出文件失败: %w", err)
	}
	defer outputFile.Close()

	options := &webp.Options{
		Lossless: false,
		Quality:  quality,
	}

	if err := webp.Encode(outputFile, img, options); err != nil {
		return fmt.Errorf("编码 WebP 失败: %w", err)
	}

	return nil
}
