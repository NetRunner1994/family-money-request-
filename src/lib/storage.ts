import { emptyData, type AppData } from "../types";

const STORAGE_KEY = "family-requests-v1";

export function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppData) : { ...emptyData };
  } catch {
    return { ...emptyData };
  }
}

export function saveData(data: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("save failed", e);
  }
}
