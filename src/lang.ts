import { lookup, officialLangOf, setErrorLanguage, translate, type Params } from "@keyring-notes/core";

/**
 * CLI 가 스스로 내는 글(결과·경고·오류)의 언어: KEYRING_LANG → LANG, 없으면 영어. 앱과 달리 서버 설정 파일은 없다.
 */
const lang: "en" | "ko" = officialLangOf(process.env.KEYRING_LANG ?? process.env.LANG);
setErrorLanguage(lang);

/**
 * CLI 의 결과 글(`cli.pkg_*`)은 이 저장소가 갖는다 — 앱은 `keyring pkg` 를 걷으며 core 메시지에서 이 키들을 지운다.
 * 글은 앱 커밋 f9434044 의 core messages(en.json·ko.json)에서 바이트 그대로 옮겼다(앱의 `keyring pkg` 와 같은 출력).
 * `cli.error` 와 core 오류 글(PathError 등)은 core 에서 읽는다.
 */
export const CLI_MESSAGES: Record<"en" | "ko", Record<string, string>> = {
  en: {
    "cli.pkg_check_ok": "OK: {id}@{version} ({type})",
    "cli.pkg_folder_mismatch": "The folder does not match the manifest (manifest: {id}@{version})",
    "cli.pkg_folder_name": "The folder must be packages/<scope>/<name>/<version> (lowercase letters, digits and -, semver version)",
    "cli.pkg_in_folder": "{folder}: {message}",
    "cli.pkg_index_unchanged": "index.json unchanged — packages: {packages}, versions: {versions} ({path})",
    "cli.pkg_index_written": "index.json written — packages: {packages}, versions: {versions} ({path})",
    "cli.pkg_no_packages": "No packages folder: {path}",
    "cli.pkg_serving": "Serving the marketplace repository at {url}",
    "cli.pkg_symlink": "Symbolic links are not allowed: {path}",
    "cli.pkg_type_mismatch": "Every version of a package must have the same type ({type}, other versions: {other})",
    "cli.pkg_warning": "warning: {message}",
  },
  ko: {
    "cli.pkg_check_ok": "통과: {id}@{version} ({type})",
    "cli.pkg_folder_mismatch": "폴더가 매니페스트와 다릅니다(매니페스트: {id}@{version})",
    "cli.pkg_folder_name": "폴더는 packages/<범위>/<이름>/<판> 이어야 합니다(소문자·숫자·-, 판은 semver)",
    "cli.pkg_in_folder": "{folder}: {message}",
    "cli.pkg_index_unchanged": "index.json 그대로 — 패키지: {packages}, 판: {versions} ({path})",
    "cli.pkg_index_written": "index.json 을 썼습니다 — 패키지: {packages}, 판: {versions} ({path})",
    "cli.pkg_no_packages": "packages 폴더가 없습니다: {path}",
    "cli.pkg_serving": "마켓 저장소를 내주는 중: {url}",
    "cli.pkg_symlink": "심볼릭 링크는 쓸 수 없습니다: {path}",
    "cli.pkg_type_mismatch": "한 패키지의 모든 판은 종류가 같아야 합니다({type}, 다른 판: {other})",
    "cli.pkg_warning": "경고: {message}",
  },
};

export function serverLanguage(): "en" | "ko" {
  return lang;
}

/** `cli.pkg_*` 는 위 표(한국어에 없으면 영어), 그 밖은 core */
export function serverText(key: string, params?: Params): string {
  if (key.startsWith("cli.pkg_")) {
    const chain = lang === "en" ? [{ messages: CLI_MESSAGES.en, locale: "en" }] : [{ messages: CLI_MESSAGES[lang], locale: lang }, { messages: CLI_MESSAGES.en, locale: "en" }];
    return lookup(chain, key, params);
  }
  return translate(lang, key, params);
}
