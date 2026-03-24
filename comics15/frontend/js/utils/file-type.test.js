import { describe, it, expect } from 'vitest';
import { isImageFile, isVideoFile, isGifFile, useVideoPath, getFileType } from './file-type.js';

describe('file-type', () => {
    describe('isImageFile', () => {
        it('should return true for jpg files', () => {
            expect(isImageFile('test.jpg')).toBe(true);
            expect(isImageFile('test.JPG')).toBe(true);
        });

        it('should return true for jpeg files', () => {
            expect(isImageFile('photo.jpeg')).toBe(true);
            expect(isImageFile('photo.JPEG')).toBe(true);
        });

        it('should return true for png files', () => {
            expect(isImageFile('image.png')).toBe(true);
            expect(isImageFile('image.PNG')).toBe(true);
        });

        it('should return true for webp files', () => {
            expect(isImageFile('picture.webp')).toBe(true);
            expect(isImageFile('picture.WEBP')).toBe(true);
        });

        it('should return false for non-image files', () => {
            expect(isImageFile('video.mp4')).toBe(false);
            expect(isImageFile('animation.gif')).toBe(false);
            expect(isImageFile('document.pdf')).toBe(false);
        });
    });

    describe('isVideoFile', () => {
        it('should return true for mp4 files', () => {
            expect(isVideoFile('movie.mp4')).toBe(true);
            expect(isVideoFile('movie.MP4')).toBe(true);
        });

        it('should return true for mov files', () => {
            expect(isVideoFile('clip.mov')).toBe(true);
            expect(isVideoFile('clip.MOV')).toBe(true);
        });

        it('should return false for non-video files', () => {
            expect(isVideoFile('image.jpg')).toBe(false);
            expect(isVideoFile('animation.gif')).toBe(false);
        });
    });

    describe('isGifFile', () => {
        it('should return true for gif files', () => {
            expect(isGifFile('animation.gif')).toBe(true);
            expect(isGifFile('animation.GIF')).toBe(true);
        });

        it('should return false for non-gif files', () => {
            expect(isGifFile('image.jpg')).toBe(false);
            expect(isGifFile('video.mp4')).toBe(false);
        });
    });

    describe('useVideoPath', () => {
        it('should return true for video files', () => {
            expect(useVideoPath('movie.mp4')).toBe(true);
            expect(useVideoPath('clip.mov')).toBe(true);
        });

        it('should return true for gif files', () => {
            expect(useVideoPath('animation.gif')).toBe(true);
        });

        it('should return false for image files', () => {
            expect(useVideoPath('photo.jpg')).toBe(false);
            expect(useVideoPath('picture.png')).toBe(false);
        });
    });

    describe('getFileType', () => {
        it('should return "image" for image files', () => {
            expect(getFileType('photo.jpg')).toBe('image');
            expect(getFileType('picture.png')).toBe('image');
            expect(getFileType('image.webp')).toBe('image');
        });

        it('should return "video" for video files', () => {
            expect(getFileType('movie.mp4')).toBe('video');
            expect(getFileType('clip.mov')).toBe('video');
        });

        it('should return "gif" for gif files', () => {
            expect(getFileType('animation.gif')).toBe('gif');
        });

        it('should return null for unsupported files', () => {
            expect(getFileType('document.pdf')).toBe(null);
            expect(getFileType('data.json')).toBe(null);
        });
    });
});