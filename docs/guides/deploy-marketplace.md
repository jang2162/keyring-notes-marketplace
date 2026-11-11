# 공식 마켓 배포

공식 마켓플레이스(`https://keyring-notes-marketplace.develma.com/`, Keyring Notes core 의 `OFFICIAL_REPO_URL`)를 띄우고 갱신하는 사람이 지킬 규칙이다. 운영자 누구나 따라 하는 절차(개인 마켓 포함)는 사용자 문서 [run-a-marketplace.md](../manual/en/how-to/run-a-marketplace.md)(번역 [ko](../manual/ko/how-to/run-a-marketplace.md))에, 저장소 형식은 앱 저장소의 [publish-packages.md](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) 에 있다. Docker·Komodo 의 공통 규칙은 앱 저장소의 `docs/guides/deploy-docker.md`·`docs/guides/deploy-komodo.md` 를 따른다.

## 구성

- 이 저장소는 pnpm Node 프로젝트다(`package.json`·`pnpm-lock.yaml`, `packageManager` 는 `pnpm@10.33.0`). 소스는 `src/`: `cli.ts`(실행 이름 `keyring-market`), `pkgCli.ts`(`check`·`index`·`serve`), `marketServe.ts`(정적 서버), `lang.ts`(출력 언어). 앱 저장소의 `server/src/pkgCli.ts`·`marketServe.ts` 와 그 시험·픽스처(`server/test/fixtures/market`)를 옮겨 온 것이다. 플래그·종료 코드·경고·`MARKET_*` 환경 변수·출력은 앱의 `keyring pkg …` 와 같게 둔다 — 다르게 하려면 사용자 문서와 앱 저장소의 안내를 같은 때에 고친다.
- 패키지 형식 검사 코드(앱의 `packages/core`, `@keyring-notes/core`)는 옮기지 않는다. `package.json` 이 앱 저장소의 커밋에 고정한 git 의존성으로 받는다(아래 「core 고정 커밋」).
- `Dockerfile` 은 이 저장소 소스를 `pnpm build` 로 번들 하나(`dist/cli.js`, core 와 그 의존성 포함)로 만들고, 실행 이미지에는 그 파일만 싣는다(`node_modules` 없음). `/usr/local/bin/keyring-market` 이 그 파일을 가리킨다. `.dockerignore` 는 빌드에 쓰는 파일만 보낸다(`packages/`·`.env`·`node_modules` 는 보내지 않는다).
- 컨테이너는 `keyring-market serve /srv/market` 하나다. 시작할 때와 `MARKET_REBUILD_SECONDS` 마다 `/srv/market/index.json` 을 다시 만들고(바뀔 때만 쓴다), `/index.json`(짧은 캐시)과 `/packages/...`(긴 캐시)만 내준다. 압축하지 않는다 — 받는 쪽이 identity 만 받는다.
- **패키지는 이 저장소에 두지 않는다.** 공식 패키지도 서버 폴더에 두고 `MARKET_PACKAGES` 로 `/srv/market/packages` 에 읽기 전용으로 마운트한다. 이미지는 패키지를 싣지 않는다. 범위 `@keyring` 은 공식 저장소에서만 받히므로 공식 패키지는 `<패키지 폴더>/keyring/…` 에 둔다.
- 리버스 프록시·TLS 는 넣지 않는다. 앱과 서버 받기는 `https:` 저장소만 받으므로 공식 마켓은 반드시 프록시 뒤에서 https 로 열린다. 프록시 네트워크·`ports` 닫기는 서버의 `compose.override.yaml`(저장소에서 ignore)에 쓴다.
- `Dockerfile` 은 BuildKit 전용 기능을 쓰지 않는다. buildx 가 없는 Docker 도 옛 빌더로 빌드한다. 앱 `Dockerfile` 의 `RUN --mount=type=secret,id=extra_ca` 는 TLS 를 다시 서명하는 사내 프록시 안에서 빌드할 때 CA 를 넘기려는 것이라 공식 마켓 서버에는 필요 없어 뺐다. 그런 망에서 빌드해야 하면 그때 다시 더하고, 사용자 문서의 준비물(BuildKit 불필요)도 같은 커밋에서 고친다.

## core 고정 커밋

- `package.json` 의 `"@keyring-notes/core": "github:jang2162/keyring-notes#<커밋>&path:packages/core"` 가 받을 앱 커밋이다. pnpm 이 GitHub 압축본(codeload)을 받아 `packages/core` 만 꺼내므로, 빌드 이미지에 git 이 없어도 된다. 전체 커밋 SHA 만 쓴다. **`v*` 태그는 쓰지 않는다** — 앱 저장소에서 `v*` 태그를 밀면 macOS 릴리스가 돈다. 이 값을 위한 태그를 앱 저장소에 만들지도 않는다. 예전 빌드 인자 `KEYRING_REF` 는 없어졌다.
- **core 를 쓰는 방식.** core 의 `exports` 는 `dist/`(빌드 결과, git 에 없음)와 `keyring-source` 조건(TypeScript 원본)을 가진다. git 의존성에는 `dist/` 가 없고, core 의 `tsconfig.build.json` 은 앱 저장소의 `tsconfig.base.json` 을 상속해 하위 경로만 받은 core 로는 `tsc` 빌드가 안 된다. 그래서 늘 `keyring-source` 조건으로 원본을 읽는다: `tsc --noEmit`(`customConditions`, core 원본도 함께 검사 — DOM lib 필요), `vitest`(`resolve.conditions` + `server.deps.inline` — `node_modules` 안의 .ts 를 변환), `pnpm keyring-market`(`tsx --conditions=keyring-source`), `pnpm build`(esbuild `conditions` 로 core·`yaml`·`diff` 까지 `dist/cli.js` 하나에 묶는다). 실행 이미지가 `node_modules` 없이 돈다.
- **올릴 때.** 앱의 패키지 형식(`index.json`·매니페스트·검사 규칙·`cli.pkg_*` 메시지 — 모두 `packages/core`)이 바뀌어 앱 `main` 에 들어가면 그 커밋으로 올린다. 공식 마켓의 index 는 받는 앱이 읽을 수 있는 형식이어야 하므로, 형식을 바꾼 앱 릴리스보다 늦지 않게 올린다. core 가 이 저장소가 쓰는 함수(`checkPackageFiles`·`parseRepoIndex`·`manifestDisplay` 등)의 꼴을 바꾸면 `src/` 도 같은 커밋에서 맞춘다.
- **올리는 법.**
  1. `package.json` 의 커밋 SHA 를 바꾼다.
  2. `pnpm install` 로 `pnpm-lock.yaml` 을 고친다(lock 의 `codeload.github.com/…/tar.gz/<커밋>` 이 바뀐다).
  3. `pnpm typecheck && pnpm test && pnpm build` 를 돌린다.
  4. 로컬에서 이미지를 빌드해 띄우고 `index.json` 과 파일 하나를 받아 본다(`docker compose up -d --build`, 패키지 폴더는 이 저장소 `test/fixtures/market/packages` 로 충분하다).
  5. `package.json`·`pnpm-lock.yaml` 을 한 커밋에 담아 push 한다.
- 앱의 `server/test/fixtures/market` 이 바뀌면(새 형식의 시험 패키지) 그 사본 `test/fixtures/market` 도 같은 커밋에서 다시 옮긴다. 파일은 바이트 그대로여야 한다 — `index.json` 이 sha256 을 담는다(`git -C <앱 클론> archive <커밋> server/test/fixtures/market | tar -x --strip-components=3 -C test/fixtures`).
- 이 값은 `package.json`(과 lock) 한 곳에만 둔다. 서버에서 잠깐 다른 커밋을 써야 하면 그 서버의 클론에서 위 1–2 를 하고 빌드한다(Komodo 는 저장소를 다시 받으면 되돌아가므로, 오래 쓸 것이면 이 저장소에 커밋한다).

## 개발

- `pnpm install` → `pnpm typecheck`·`pnpm test`·`pnpm build`. 시험은 `test/`(옮겨 온 `pkgCli.test.ts`·`marketServe.test.ts`)이고 CLI 시험은 `tsx` 로 `src/cli.ts` 를 띄운다.
- `pnpm-workspace.yaml` 은 워크스페이스가 아니라 pnpm 10 설정(`onlyBuiltDependencies: esbuild`)을 두는 곳이다.

## Komodo Stack 설정

| 항목 | 값 |
| --- | --- |
| Name | 마켓용 이름(앱 Stack 과 다르게 — compose project 이름이 갈린다) |
| Source | Git Repo — 이 저장소, `main` |
| Run Directory | 저장소 맨 위(비워 두거나 `.`) |
| File Paths | 한 줄씩 이 순서로: `compose.yaml`, `compose.override.yaml`. `COMPOSE_FILE` 은 쓰지 않는다 |
| Environment | 아래 표 |
| Webhook | 켬 — 이 저장소의 push 는 서버 소스·구성이나 core 고정 커밋을 바꾼 것뿐이라 다시 빌드할 이유가 있다. 문서만 바꾼 push 는 같은 이미지가 나와 컨테이너를 다시 만들지 않는다. 패키지 갱신은 push 가 아니라 서버 폴더에서 한다(아래 「갱신 절차」) |
| override 파일 | 서버의 `{stack_dir}/{Stack 이름}/compose.override.yaml`. 앱 Stack 의 override 와 같은 꼴(`ports: !reset []`, 프록시 외부 네트워크 `external: true`). 네트워크 이름은 서버 전용이라 여기에 적지 않는다 |

Environment:

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `MARKET_PACKAGES` | 예 | 서버의 공식 패키지 폴더 절대 경로(예: `/srv/keyring-notes-market/packages`). Stack 폴더 밖에 둔다 — Komodo 가 저장소를 다시 받을 때 지워지지 않게 |
| `MARKET_NAME` | 아니오 | 저장소 이름(`index.json` 의 `name`). 기본 `Keyring Notes` |
| `MARKET_REBUILD_SECONDS` | 아니오 | `index.json` 을 다시 만드는 주기. 기본 60 |
| `MARKET_BIND`, `MARKET_PORT` | 아니오 | 호스트 쪽 바인드. 프록시 뒤면 override 가 `ports` 를 닫으므로 쓰지 않는다 |

compose 는 `container_name` 을 쓰지 않고, `pull_policy: build` 라 Deploy 마다 이 저장소로 빌드한다.

## 갱신 절차

공식 패키지의 새 판은 push·Deploy 없이 서버 폴더에서 낸다.

1. 새 판 폴더를 `MARKET_PACKAGES` 와 같은 디스크의 임시 폴더에 복사한다.
2. 마켓 이미지로 임시 폴더를 검사한다. `keyring-market check` 는 폴더 경로를 보지 않으므로 아무 자리에 마운트해도 된다. 오류면 종료 코드 `1` 이다 — 고친 뒤 다시 본다.

   ```bash
   docker run --rm -v <임시 판 폴더>:/check:ro keyring-notes-market:local keyring-market check /check
   ```

   잘못된 판을 그대로 옮기면 서버는 마지막으로 성공한 `index.json` 을 계속 내준다. 그 사이 다른 새 판도 보이지 않으므로 옮기기 전에 검사한다.

3. `mv` 로 `<패키지 폴더>/keyring/<name>/<version>/` 에 옮긴다. 같은 디스크 안의 `mv` 는 한 번에 끝나 반쯤 복사된 판이 index 에 잡히지 않는다.
4. `MARKET_REBUILD_SECONDS`(기본 60초) 안에 index 가 다시 만들어진다. `https://keyring-notes-marketplace.develma.com/index.json` 에 새 판이 보이는지 본다. 안 보이면 `docker compose logs market` 에서 이유를 본다.

**이미 낸 판의 파일은 바꾸지 않는다.** 잠금이 그 판의 sha256 을 모든 기기에 고정해 두었다. 고칠 것은 새 판으로 낸다. 판 폴더를 지우는 것도 그 판을 잠근 기기의 설치를 깨므로 하지 않는다.
