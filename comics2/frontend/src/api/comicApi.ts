import axios from 'axios';
import type { ChapterFiles, SeriesResponse } from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export async function fetchSeries() {
  const { data } = await client.get<SeriesResponse>('/series');
  return data.items;
}

export async function fetchSeasons(series: string) {
  const { data } = await client.get<SeriesResponse>(`/seasons/${encodeURIComponent(series)}`);
  return data.items;
}

export async function fetchChapters(series: string, season: string) {
  const { data } = await client.get<SeriesResponse>(
    `/chapters/${encodeURIComponent(series)}/${encodeURIComponent(season)}`,
  );
  return data.items;
}

export async function fetchChapterFiles(series: string, season: string, chapter: string) {
  const { data } = await client.get<ChapterFiles>(
    `/chapter/${encodeURIComponent(series)}/${encodeURIComponent(season)}/${encodeURIComponent(chapter)}`,
  );
  return data.files;
}

export function contentUrl(series: string, season: string, chapter: string, filename: string) {
  return `/api/content/${encodeURIComponent(series)}/${encodeURIComponent(season)}/${encodeURIComponent(chapter)}/${encodeURIComponent(filename)}`;
}
