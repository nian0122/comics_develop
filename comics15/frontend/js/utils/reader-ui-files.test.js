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

    it('progressStatus 右下角固定、半透明背景加磨砂模糊', () => {
        const css = readProjectFile('css/components.css');
        const progressRule = extractCssRule(css, '.reader-progress-pill');

        expect(progressRule).toContain('right: 16px;');
        expect(progressRule).toContain('bottom: 16px;');
        expect(progressRule).toContain('background: rgba(15, 17, 21, 0.42);');
        expect(progressRule).toContain('backdrop-filter: blur(8px);');
        expect(progressRule).toContain('-webkit-backdrop-filter: blur(8px);');
    });

    it('目录首图容器固定尺寸并隔离布局绘制', () => {
        const css = readProjectFile('css/components.css');
        const coverRule = extractCssRule(css, '.chapter-cover');
        const desktopRuleStart = css.indexOf('@media (min-width: 769px)');
        const desktopRules = desktopRuleStart >= 0 ? css.slice(desktopRuleStart) : '';

        expect(coverRule).toContain('width: 88px;');
        expect(coverRule).toContain('height: 104px;');
        expect(coverRule).toContain('min-width: 88px;');
        expect(coverRule).toContain('contain: layout paint;');
        expect(desktopRules).toContain('.chapter-cover');
        expect(desktopRules).toContain('width: 120px;');
    });

    it('移动端关闭磨砂和目录卡片阴影以降低滚动重绘成本', () => {
        const css = readProjectFile('css/components.css');
        const mobileRuleStart = css.indexOf('@media (max-width: 768px)');
        const mobileRules = mobileRuleStart >= 0 ? css.slice(mobileRuleStart, css.indexOf('@media (min-width: 769px)', mobileRuleStart)) : '';

        expect(mobileRules).toContain('backdrop-filter: none;');
        expect(mobileRules).toContain('-webkit-backdrop-filter: none;');
        expect(mobileRules).toContain('box-shadow: none;');
    });
});
