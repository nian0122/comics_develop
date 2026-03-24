// 自然排序工具

export function naturalSort(text) {
    return text.split(/(\d+)/).map(c => parseInt(c) || c);
}