import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";

export async function getSettingsMap() {
  const db = getDb();
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.settingKey] = row.settingValue ?? "";
  }
  return map;
}

export async function getSetting(key: string, fallback = "") {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.settingKey, key)).limit(1);
  return row?.settingValue ?? fallback;
}

/**
 * All settings, read once per page render: the root layout, the app layout and the page share one
 * query instead of each reading its own keys. Use this only while rendering; server actions should
 * keep reading fresh values with getSetting/getSettingsMap.
 */
export const getRenderSettings = cache(getSettingsMap);

export async function getRenderSetting(key: string, fallback = "") {
  return (await getRenderSettings())[key] ?? fallback;
}
