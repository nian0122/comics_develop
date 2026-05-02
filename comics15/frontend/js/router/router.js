import { parseRoute } from './route-parser.js';

export class Router {
    constructor(onRouteChange) {
        this.onRouteChange = onRouteChange;
        this.handlePopState = () => this.renderCurrentRoute();
        this.isStarted = false;
    }

    start() {
        this.ensureStarted();
        this.renderCurrentRoute();
    }

    ensureStarted() {
        if (this.isStarted) return;
        window.addEventListener('popstate', this.handlePopState);
        this.isStarted = true;
    }

    navigate(url) {
        this.ensureStarted();
        if (this.isCurrentUrl(url)) return;
        history.pushState({}, '', url);
        this.renderCurrentRoute();
    }

    replace(url) {
        this.ensureStarted();
        history.replaceState({}, '', url);
        this.renderCurrentRoute();
    }

    renderCurrentRoute() {
        this.onRouteChange(parseRoute());
    }

    isCurrentUrl(url) {
        const targetUrl = new URL(url, window.location.origin);
        return targetUrl.pathname === window.location.pathname
            && targetUrl.search === window.location.search
            && targetUrl.hash === window.location.hash;
    }
}
