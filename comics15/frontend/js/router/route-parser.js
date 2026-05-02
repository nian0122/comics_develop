function safeDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
}

function decodePathSegments(parts) {
    const decodedParts = [];
    for (const part of parts.filter(Boolean)) {
        const decoded = safeDecodeURIComponent(part);
        if (decoded === null) return null;
        decodedParts.push(decoded);
    }
    return decodedParts.join('/');
}

export function parseRoute(pathname = window.location.pathname) {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
        return { name: 'seriesList' };
    }

    if (parts[0] !== 'series' || !parts[1]) {
        return { name: 'notFound' };
    }

    const series = safeDecodeURIComponent(parts[1]);
    if (series === null) {
        return { name: 'notFound' };
    }

    if (parts.length === 2) {
        return {
            name: 'directory',
            series,
            path: '',
        };
    }

    if (parts[2] === 'dir') {
        const path = decodePathSegments(parts.slice(3));
        if (path === null) return { name: 'notFound' };
        return {
            name: 'directory',
            series,
            path,
        };
    }

    if (parts[2] === 'read' && parts.length > 3) {
        const path = decodePathSegments(parts.slice(3));
        if (path === null) return { name: 'notFound' };
        return {
            name: 'reader',
            series,
            path,
        };
    }

    return { name: 'notFound' };
}
