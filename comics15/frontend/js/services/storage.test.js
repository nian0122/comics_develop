import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from './storage.js';

describe('storage', () => {
    const mockLocalStorage = (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => { store[key] = value; },
            removeItem: (key) => { delete store[key]; },
            clear: () => { store = {}; },
            get length() { return Object.keys(store).length; },
            key: (i) => Object.keys(store)[i] || null
        };
    })();

    beforeEach(() => {
        vi.stubGlobal('localStorage', mockLocalStorage);
        mockLocalStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('get and set', () => {
        it('should store and retrieve JSON data', () => {
            storage.set('test', { foo: 'bar' });
            expect(storage.get('test')).toEqual({ foo: 'bar' });
        });

        it('should return null for non-existent key', () => {
            expect(storage.get('nonexistent')).toBe(null);
        });
    });

    describe('getCurrentSeries and setCurrentSeries', () => {
        it('should store and retrieve current series', () => {
            storage.setCurrentSeries('TestSeries');
            expect(storage.getCurrentSeries()).toBe('TestSeries');
        });
    });

    describe('getCurrentChapterPath and setCurrentChapterPath', () => {
        it('should store and retrieve current chapter path', () => {
            storage.setCurrentChapterPath('chapter1/page1');
            expect(storage.getCurrentChapterPath()).toBe('chapter1/page1');
        });
    });

    describe('getExpandedPaths and setExpandedPath', () => {
        it('should store and retrieve expanded paths', () => {
            storage.setExpandedPath('chapter1', true);
            storage.setExpandedPath('chapter2', false);

            const expanded = storage.getExpandedPaths();
            expect(expanded['chapter1']).toBe(true);
            expect(expanded['chapter2']).toBe(false);
        });
    });

    describe('progress', () => {
        it('should generate correct progress key', () => {
            expect(storage.getProgressKey('Series', 5)).toBe('progress_Series_5');
        });

        it('should store and retrieve progress', () => {
            storage.setProgress('Series', 1, { page: 10, scrollPercent: 50 });
            const progress = storage.getProgress('Series', 1);

            expect(progress).toEqual({ page: 10, scrollPercent: 50 });
        });
    });

    describe('remove', () => {
        it('should remove stored item', () => {
            storage.set('test', 'value');
            storage.remove('test');
            expect(storage.get('test')).toBe(null);
        });
    });
});