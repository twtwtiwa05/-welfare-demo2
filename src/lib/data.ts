// 합성 가구 데이터 로더. scripts/generate-data.mjs가 생성한 JSON을 타입과 함께 노출.
import raw from "../data/households.json";
import type { Household } from "./types";

export const HOUSEHOLDS = raw as Household[];

export function getHousehold(id: string): Household | undefined {
  return HOUSEHOLDS.find((h) => h.id === id);
}
