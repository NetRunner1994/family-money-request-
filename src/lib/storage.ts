import { emptyData, normalizeData, type AppData } from "../types";

const STORAGE_KEY = "family-requests-v1";
const CODE_KEY = "family-code";

export function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : { ...emptyData };
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

export function loadFamilyCode(): string | null {
  try {
    return window.localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

const KID_KEY = "kid-identity";

export function loadKidIdentity(): string | null {
  try {
    return window.localStorage.getItem(KID_KEY);
  } catch {
    return null;
  }
}

export function saveKidIdentity(kidId: string | null) {
  try {
    if (kidId) window.localStorage.setItem(KID_KEY, kidId);
    else window.localStorage.removeItem(KID_KEY);
  } catch (e) {
    console.error("save kid identity failed", e);
  }
}

export function saveFamilyCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(CODE_KEY, code);
    else window.localStorage.removeItem(CODE_KEY);
  } catch (e) {
    console.error("save code failed", e);
  }
}
