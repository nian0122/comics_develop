// 应用配置常量

export const LAZY_LOAD_CONFIG = {
    ROOT_MARGIN: '1500px',
    COVER_ROOT_MARGIN: '80px 0px',
    INITIAL_BATCH: 10,
    BATCH_SIZE: 10,
    COVER_MAX_CONCURRENT: 3,
};

export const IMAGE_RETRY_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
};

export const SCROLL_CONFIG = {
    DIRECTION_THRESHOLD: 50,
    LOAD_THRESHOLD: 300,
};

export const JUMP_CONFIG = {
    PRELOAD_AROUND: 3,
    LOAD_TIMEOUT: 5000,
};

export const DOUBLE_CLICK_THRESHOLD = 300;

export const MAX_IMAGES_TO_FETCH = 500;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const VIDEO_EXTENSIONS = ['.mp4', '.mov'];
export const GIF_EXTENSION = '.gif';