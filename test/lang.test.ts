import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

// 앱이 core messages 에서 `cli.pkg_*` 를 지운 뒤를 흉내 낸다: core 의 translate 는 그 키를 모르면 키 이름을 그대로 돌려준다
vi.mock("@keyring-notes/core", async (importOriginal) => {
  const core = await importOriginal<typeof import("@keyring-notes/core")>();
  return {
    ...core,
    translate: (lang: string, key: string, params?: Record<string, string | number>) => (key.startsWith("cli.pkg_") ? key : core.translate(lang, key, params)),
  };
});

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "market", "packages", "me", "clock", "1.0.0");

async function checkOutput(lang: string): Promise<string[]> {
  vi.resetModules();
  vi.stubEnv("KEYRING_LANG", lang);
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((m: unknown) => void lines.push(String(m)));
  try {
    const { runPkg } = await import("../src/pkgCli.js");
    await runPkg(["check", fixtureDir]);
  } finally {
    spy.mockRestore();
  }
  return lines;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CLI 결과 글", () => {
  it("core 메시지에 cli.pkg_* 가 없어도 check 는 키 이름이 아니라 글을 찍는다(en)", async () => {
    expect(await checkOutput("en")).toEqual(["OK: @me/clock@1.0.0 (widget)"]);
  });

  it("core 메시지에 cli.pkg_* 가 없어도 check 는 키 이름이 아니라 글을 찍는다(ko)", async () => {
    expect(await checkOutput("ko")).toEqual(["통과: @me/clock@1.0.0 (widget)"]);
  });

  it("cli.error 는 core 에서 읽는다", async () => {
    vi.resetModules();
    vi.stubEnv("KEYRING_LANG", "en");
    const { serverText } = await import("../src/lang.js");
    expect(serverText("cli.error", { message: "x" })).toBe("Error: x");
  });

  it("표의 글은 고정한 core 에 그 키가 남아 있으면 그 글과 바이트가 같다", async () => {
    const real = await vi.importActual<typeof import("@keyring-notes/core")>("@keyring-notes/core");
    const { CLI_MESSAGES } = await import("../src/lang.js");
    expect(Object.keys(CLI_MESSAGES.en).sort()).toEqual(Object.keys(CLI_MESSAGES.ko).sort());
    expect(Object.keys(CLI_MESSAGES.en)).toHaveLength(11);
    for (const lang of ["en", "ko"] as const)
      for (const [key, text] of Object.entries(CLI_MESSAGES[lang])) {
        const fromCore = real.translate(lang, key);
        if (fromCore !== key) expect(text, `${lang} ${key}`).toBe(fromCore);
      }
  });
});
