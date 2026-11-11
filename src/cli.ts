import { serverText } from "./lang.js";
import { runPkg } from "./pkgCli.js";

/**
 * `keyring-market <check|index|serve> …` — 앱의 `keyring pkg …` 를 옮긴 실행 파일.
 * 오류는 `cli.error` 꼴로 stderr 에 쓰고 종료 코드 1(앱과 같다).
 */
// pnpm 은 `pnpm keyring-market -- check …` 의 `--` 를 그대로 넘긴다(npm 은 뺀다). 두 꼴 모두 받는다
const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
runPkg(args).catch((e) => {
  console.error(serverText("cli.error", { message: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
});
