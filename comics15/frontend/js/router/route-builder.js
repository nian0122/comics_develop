export function encodePathSegments(path) {
    return (path || '')
        .replaceAll(String.fromCharCode(92), '/')
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

export function toSeriesListUrl() {
    return '/';
}

export function toSeriesUrl(series) {
    return `/series/${encodeURIComponent(series)}`;
}

export function toDirectoryUrl(series, path = '') {
    const encodedPath = encodePathSegments(path);
    const base = toSeriesUrl(series);
    return encodedPath ? `${base}/dir/${encodedPath}` : base;
}

export function toReaderUrl(series, chapterPath) {
    return `${toSeriesUrl(series)}/read/${encodePathSegments(chapterPath)}`;
}
