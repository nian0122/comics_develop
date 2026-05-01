import { describe, it, expect } from 'vitest';
import * as components from './index.js';
import { Reader } from './reader.js';

describe('components barrel', () => {
    it('exports only active components', () => {
        expect(Object.keys(components)).toEqual(['Reader']);
        expect(components.Reader).toBe(Reader);
        expect('Sidebar' in components).toBe(false);
    });
});
