export function getReaderMenuVisibilityState({ previousScrollTop, currentScrollTop, isManuallyHidden = false }) {
    if (isManuallyHidden) {
        return { shouldHide: true, nextScrollTop: currentScrollTop };
    }

    return {
        shouldHide: currentScrollTop > previousScrollTop,
        nextScrollTop: currentScrollTop,
    };
}
