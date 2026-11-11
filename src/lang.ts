import { officialLangOf, setErrorLanguage, translate, type Params } from "@keyring-notes/core";

/**
 * CLI 가 스스로 내는 글(결과·경고·오류)의 언어: KEYRING_LANG → LANG, 없으면 영어.
 * 글은 core 의 메시지를 그대로 쓰므로 앱의 `keyring pkg …` 와 같다. 앱과 달리 서버 설정 파일은 없다.
 */
const lang: "en" | "ko" = officialLangOf(process.env.KEYRING_LANG ?? process.env.LANG);
setErrorLanguage(lang);

export function serverLanguage(): "en" | "ko" {
  return lang;
}

export function serverText(key: string, params?: Params): string {
  return translate(lang, key, params);
}
