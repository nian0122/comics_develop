// 文件类型判断工具

import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, GIF_EXTENSION } from '../config/constants.js';

export function isImageFile(filename) {
    const lowerFilename = filename.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

export function isVideoFile(filename) {
    const lowerFilename = filename.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

export function isGifFile(filename) {
    return filename.toLowerCase().endsWith(GIF_EXTENSION);
}

export function useVideoPath(filename) {
    return isVideoFile(filename) || isGifFile(filename);
}

export function getFileType(filename) {
    if (isImageFile(filename)) return 'image';
    if (isVideoFile(filename)) return 'video';
    if (isGifFile(filename)) return 'gif';
    return null;
}