import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Router } from './router.js';

describe('Router', () => {
    beforeEach(() => {
        history.replaceState({}, '', '/');
    });

    test('starts by rendering the current route', () => {
        history.replaceState({}, '', '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
        const onRouteChange = vi.fn();
        const router = new Router(onRouteChange);

        router.start();

        expect(onRouteChange).toHaveBeenCalledWith({
            name: 'directory',
            series: '海贼王',
            path: '',
        });
    });

    test('navigates with pushState and renders the parsed route', () => {
        const onRouteChange = vi.fn();
        const router = new Router(onRouteChange);

        router.navigate('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D');

        expect(window.location.pathname).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/read/%E4%B8%9C%E6%B5%B7%E7%AF%87/%E7%AC%AC001%E8%AF%9D');
        expect(onRouteChange).toHaveBeenCalledWith({
            name: 'reader',
            series: '海贼王',
            path: '东海篇/第001话',
        });
    });

    test('replaces history entries and renders the parsed route', () => {
        const onRouteChange = vi.fn();
        const router = new Router(onRouteChange);

        router.replace('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87');

        expect(window.location.pathname).toBe('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B/dir/%E4%B8%9C%E6%B5%B7%E7%AF%87');
        expect(onRouteChange).toHaveBeenCalledWith({
            name: 'directory',
            series: '海贼王',
            path: '东海篇',
        });
    });
    test('skips duplicate navigation to the current URL', () => {
        history.replaceState({}, '', '/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');
        const onRouteChange = vi.fn();
        const router = new Router(onRouteChange);

        router.navigate('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');

        expect(onRouteChange).not.toHaveBeenCalled();
    });

    test('replace before start installs the popstate listener', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        const onRouteChange = vi.fn();
        const router = new Router(onRouteChange);

        router.replace('/series/%E6%B5%B7%E8%B4%BC%E7%8E%8B');

        expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
        addEventListenerSpy.mockRestore();
    });

});
