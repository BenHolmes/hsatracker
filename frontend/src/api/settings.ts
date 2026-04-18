import type { AppSettings, AppSettingsUpdate } from '../types'
import { api } from './client'

export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get<AppSettings>('/api/v1/settings/')
  return data
}

export async function updateSettings(patch: AppSettingsUpdate): Promise<AppSettings> {
  const { data } = await api.patch<AppSettings>('/api/v1/settings/', patch)
  return data
}
