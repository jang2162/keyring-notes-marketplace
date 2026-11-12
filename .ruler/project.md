# keyring-notes-marketplace 에이전트 지침

이 파일은 **keyring-notes-marketplace 저장소만의 규칙**을 담는다. 모든 프로젝트에 공통인 규칙은 `guideline` 서버에서 받은 스택(`.ruler/<스택>/`)이 갖는다.

이 저장소는 Keyring Notes 의 마켓 서버(정적 패키지 저장소)와 `keyring-market check|index|serve` CLI 다. 앱 저장소(jang2162/keyring-notes)에서 옮겨 왔고, 패키지 형식 코드는 앱의 `packages/core` 에 남아 있다.

- 응답은 **한국어**로 한다. **커밋 메시지는 영어**로 쓴다(이 저장소 관례). 운영 문서 `docs/guides/` 는 한국어다. 공개 문서는 영어가 원본이다: `README.md` 와 `README.ko.md`, `docs/manual/en/`(원본)과 `docs/manual/ko/`(번역)는 같은 커밋에서 함께 고친다. 플래그·환경 변수·출력·compose 설정을 바꾸면 그 사용자 문서도 고친다.
- **`main` 에 push 하면 공식 마켓이 다시 배포된다**(Komodo Stack 의 Webhook). push 전에 사람 확인을 받고, 아래 검사를 모두 통과한 것만 올린다.
- **패키지를 이 저장소에 넣지 않는다.** 공식 패키지도 서버 폴더(`MARKET_PACKAGES`)에서 관리한다. 기본 폴더 `./packages` 는 gitignore 다. 시험 패키지는 `test/fixtures/market` 이고, 앱의 `server/test/fixtures/market` 을 바이트 그대로 옮긴 사본이다(`index.json` 이 sha256 을 담는다). 손으로 고치지 않는다.
- **이미 낸 판의 파일은 바꾸지도 지우지도 않는다.** 기기마다 잠금이 그 판의 sha256 을 고정해 두었다. 고칠 것은 새 판으로 낸다.
- `@keyring-notes/core` 는 앱 저장소의 **전체 커밋 SHA** 에 고정한 git 의존성이다(`package.json`·`pnpm-lock.yaml` 한 곳). **`v*` 태그를 쓰지도, 앱 저장소에 만들지도 않는다** — 앱에서 `v*` 태그를 밀면 macOS 릴리스가 돈다. 올리는 절차는 `docs/guides/deploy-marketplace.md` 「core 고정 커밋」 을 따른다.
- core 는 `keyring-source` 조건으로 TypeScript 원본을 읽는다(git 의존성에는 `dist/` 가 없다). `tsconfig.json`·`vitest.config.ts`·`scripts/build.mjs`·`package.json` 의 이 조건을 빼지 않는다.
- CLI 의 플래그·종료 코드·경고·`MARKET_*` 환경 변수·출력은 앱의 옛 `keyring pkg …` 와 같게 둔다. 다르게 하려면 사용자 문서와 앱 저장소의 안내를 같은 때에 고친다. 결과 글(`cli.pkg_*`)은 core 가 아니라 `src/lang.ts` 가 갖는다.
- `@intellectronica/ruler` 는 **`0.3.44` 로 정확히 고정**한다(앱 저장소와 같은 판). 0.3.46 은 `.mcp.json`·`opencode.json`·`.codex/config.toml` 을 gitignore 블록에서 빼서 생성물이 추적 대상으로 뜨고, 다른 판이 만든 `AGENTS.md.bak` 가 있으면 apply 를 거부한다. 올리려면 apply 뒤 `git status` 에 생성물이 뜨지 않는지 먼저 본다.
- `Dockerfile` 에 BuildKit 전용 기능(`RUN --mount` 등)을 쓰지 않는다. buildx 가 없는 Docker 도 옛 빌더로 빌드한다.
- 다 했다고 말하기 전에 `pnpm typecheck`, `pnpm test`, `pnpm build` 를 돌린다. `Dockerfile`·compose·서버 코드를 바꿨으면 옛 빌더(`DOCKER_BUILDKIT=0 docker compose up -d --build`)로 띄워 `/index.json` 과 패키지 파일 하나를 받아 보고, 만든 컨테이너·이미지를 지운다.

## 작업별로 읽을 문서

| 언제 | 읽을 문서 |
| --- | --- |
| 공식 마켓을 배포하거나, Komodo Stack·서버 override·core 고정 커밋·공식 패키지 갱신을 다룰 때 | `docs/guides/deploy-marketplace.md` |
| 운영자용 설치·https 프록시·설정 안내를 고칠 때 | `docs/manual/en/how-to/run-a-marketplace.md` |
| `keyring-market check`·`index` 의 동작이나 안내를 고칠 때 | `docs/manual/en/how-to/check-and-index-packages.md` |
| 패키지 형식(index.json·매니페스트·검사 규칙)을 볼 때 | 앱 저장소 `docs/manual/en/how-to/publish-packages.md` |
