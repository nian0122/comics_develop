export function getUnloadedCoverIndexes(rootEl) {
    return Array.from(rootEl.querySelectorAll('[data-cover-index]'))
        .filter(coverEl => !['loading', 'loaded'].includes(coverEl.dataset.coverState))
        .map(coverEl => Number(coverEl.dataset.coverIndex))
        .filter(Number.isInteger);
}

export function markCoverLoading(coverEl) {
    coverEl.dataset.coverState = 'loading';
}

export function markCoverLoaded(coverEl) {
    coverEl.dataset.coverState = 'loaded';
}

export function markCoverIdle(coverEl) {
    delete coverEl.dataset.coverState;
    coverEl.classList.add('skeleton');
    coverEl.classList.remove('chapter-cover-placeholder');
}

export function unloadCoverImage(coverEl) {
    const imgEl = coverEl.querySelector('img');
    if (!imgEl) return;

    imgEl.src = '';
    imgEl.load && imgEl.load();
    coverEl.textContent = '';
    markCoverIdle(coverEl);
}
