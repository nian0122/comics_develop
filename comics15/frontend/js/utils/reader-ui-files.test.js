import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');

function readProjectFile(path) {
    return readFileSync(resolve(root, path), 'utf-8');
}

function extractCssRule(css, selector) {
    const start = css.indexOf(`${selector} {`);
    const end = css.indexOf('\n}', start);
    return start >= 0 && end >= 0 ? css.slice(start, end + 2) : '';
}

describe('reader UI files', () => {
    it('不再渲染隐藏菜单按钮入口', () => {
        const html = readProjectFile('index.html');
        const main = readProjectFile('js/main.js');

        expect(html).not.toContain('hideFabBtn');
        expect(main).not.toContain('hideFabBtn');
        expect(main).not.toContain('hideFab()');
    });

    it('progressStatus 背景透明且没有磨砂模糊效果', () => {
        const css = readProjectFile('css/components.css');
        const progressRule = extractCssRule(css, '.reader-progress-pill');

        expect(progressRule).toContain('background: transparent;');
        expect(progressRule).not.toContain('backdrop-filter');
        expect(progressRule).not.toContain('-webkit-backdrop-filter');
    });
});
