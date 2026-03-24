import { describe, it, expect } from 'vitest';
import { naturalSort } from './natural-sort.js';

describe('naturalSort', () => {
    it('should split text into numbers and strings', () => {
        expect(naturalSort('chapter1')).toEqual(['chapter', 1, '']);
        expect(naturalSort('chapter10page2')).toEqual(['chapter', 10, 'page', 2, '']);
    });

    it('should handle leading numbers', () => {
        expect(naturalSort('123abc')).toEqual(['', 123, 'abc']);
    });

    it('should handle text without numbers', () => {
        expect(naturalSort('chapter')).toEqual(['chapter']);
    });

    it('should handle numbers only', () => {
        expect(naturalSort('123')).toEqual(['', 123, '']);
    });

    it('should handle empty string', () => {
        expect(naturalSort('')).toEqual(['']);
    });

    it('should work for sorting comparison', () => {
        const items = ['chapter10', 'chapter2', 'chapter1'];
        items.sort((a, b) => {
            const keysA = naturalSort(a);
            const keysB = naturalSort(b);
            for (let i = 0; i < Math.min(keysA.length, keysB.length); i++) {
                if (keysA[i] < keysB[i]) return -1;
                if (keysA[i] > keysB[i]) return 1;
            }
            return keysA.length - keysB.length;
        });

        expect(items).toEqual(['chapter1', 'chapter2', 'chapter10']);
    });
});