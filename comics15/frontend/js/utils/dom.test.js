import { describe, it, expect, beforeEach } from 'vitest';
import { $, $$, escapeHtml, createEl } from './dom.js';

describe('dom utils', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="container">
                <div class="item">Item 1</div>
                <div class="item">Item 2</div>
                <span id="test">Test</span>
            </div>
        `;
    });

    describe('$', () => {
        it('should select single element', () => {
            const el = $('#container');
            expect(el).not.toBeNull();
            expect(el.id).toBe('container');
        });

        it('should return null for non-existent element', () => {
            expect($('#nonexistent')).toBeNull();
        });

        it('should work with context', () => {
            const container = $('#container');
            const item = $('.item', container);
            expect(item).not.toBeNull();
            expect(item.textContent).toBe('Item 1');
        });
    });

    describe('$$', () => {
        it('should select all matching elements', () => {
            const items = $$('.item');
            expect(items.length).toBe(2);
            expect(items[0].textContent).toBe('Item 1');
            expect(items[1].textContent).toBe('Item 2');
        });

        it('should return empty array for no matches', () => {
            expect($$('.nonexistent')).toEqual([]);
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('should handle normal text', () => {
            expect(escapeHtml('Hello World')).toBe('Hello World');
        });

        it('should handle ampersand', () => {
            expect(escapeHtml('a & b')).toBe('a &amp; b');
        });
    });

    describe('createEl', () => {
        it('should create element with tag', () => {
            const el = createEl('div');
            expect(el.tagName).toBe('DIV');
        });

        it('should set className', () => {
            const el = createEl('div', { className: 'test-class' });
            expect(el.className).toBe('test-class');
        });

        it('should set dataset', () => {
            const el = createEl('div', { dataset: { id: '123', name: 'test' } });
            expect(el.dataset.id).toBe('123');
            expect(el.dataset.name).toBe('test');
        });

        it('should add event listener via addEventListener', () => {
            let clicked = false;
            const handler = () => { clicked = true; };
            const el = createEl('button', { onclick: handler });
            el.click();
            expect(clicked).toBe(true);
        });

        it('should set other attributes', () => {
            const el = createEl('input', { type: 'text', placeholder: 'Enter text' });
            expect(el.type).toBe('text');
            expect(el.placeholder).toBe('Enter text');
        });

        it('should append text children', () => {
            const el = createEl('span', {}, ['Hello', ' World']);
            expect(el.textContent).toBe('Hello World');
        });

        it('should append element children', () => {
            const child = createEl('span', {}, ['Child']);
            const parent = createEl('div', {}, [child]);
            expect(parent.children.length).toBe(1);
            expect(parent.children[0].textContent).toBe('Child');
        });
    });
});