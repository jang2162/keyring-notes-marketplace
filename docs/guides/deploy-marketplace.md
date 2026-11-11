# 공식 마켓 배포

공식 마켓플레이스(`https://keyring-notes-marketplace.develma.com/`, Keyring Notes core 의 `OFFICIAL_REPO_URL`)를 띄우고 갱신하는 사람이 지킬 규칙이다. 운영자 누구나 따라 하는 절차(개인 마켓 포함)는 사용자 문서 [run-a-marketplace.md](../manual/en/how-to/run-a-marketplace.md)(번역 [ko](../manual/ko/how-to/run-a-marketplace.md))에, 저장소 형식은 앱 저장소의 [publish-packages.md](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) 에 있다. Docker·Komodo 의 공통 규칙은 앱 저장소의 `docs/guides/deploy-docker.md`·`docs/guides/deploy-komodo.md` 를 따른다.

## 구성

- 이 저장소에는 Docker 구성만 있다: `Dockerfile`, `compose.yaml`, `.env.example`. 마켓 서버 코드(`server/src/marketServe.ts`)는 복사하지 않는다. `Dockerfile` 이 빌드할 때 앱 저장소의 `KEYRING_REF` 커밋 압축본(GitHub archive)을 받아 core·서버만 빌드한다(웹 화면 없음).
- 컨테이너는 `keyring pkg serve /srv/market` 하나다. 시작할 때와 `MARKET_REBUILD_SECONDS` 마다 `/srv/market/index.json` 을 다시 만들고(바뀔 때만 쓴다), `/index.json`(짧은 캐시)과 `/packages/...`(긴 캐시)만 내준다. 압축하지 않는다 — 받는 쪽이 identity 만 받는다.
- **패키지는 이 저장소에 두지 않는다.** 공식 패키지도 서버 폴더에 두고 `MARKET_PACKAGES` 로 `/srv/market/packages` 에 읽기 전용으로 마운트한다. 이미지는 패키지를 싣지 않는다. 범위 `@keyring` 은 공식 저장소에서만 받히므로 공식 패키지는 `<패키지 폴더>/keyring/…` 에 둔다.
- 리버스 프록시·TLS 는 넣지 않는다. 앱과 서버 받기는 `https:` 저장소만 받으므로 공식 마켓은 반드시 프록시 뒤에서 https 로 열린다. 프록시 네트워크·`ports` 닫기는 서버의 `compose.override.yaml`(저장소에서 ignore)에 쓴다.
- `Dockerfile` 은 BuildKit 전용 기능을 쓰지 않는다. buildx 가 없는 Docker 도 옛 빌더로 빌드한다. 앱 `Dockerfile` 의 `RUN --mount=type=secret,id=extra_ca` 는 TLS 를 다시 서명하는 사내 프록시 안에서 빌드할 때 CA 를 넘기려는 것이라 공식 마켓 서버에는 필요 없어 뺐다. 그런 망에서 빌드해야 하면 그때 다시 더하고, 사용자 문서의 준비물(BuildKit 불필요)도 같은 커밋에서 고친다.

## 앱 버전(KEYRING_REF)

- `Dockerfile` 의 `ARG KEYRING_REF` 가 받을 앱 커밋이다. 전체 커밋 SHA 만 쓴다. **`v*` 태그는 쓰지 않는다** — 앱 저장소에서 `v*` 태그를 밀면 macOS 릴리스가 돈다. 이 값을 위한 태그를 앱 저장소에 만들지도 않는다.
- 앱의 패키지 형식(`index.json`·매니페스트·검사 규칙)이나 마켓 서버(`server/src/marketServe.ts`·`pkgCli.ts`)가 바뀌어 앱 `main` 에 들어가면 이 값을 그 커밋으로 올린다. 공식 마켓의 index 는 받는 앱이 읽을 수 있는 형식이어야 하므로, 형식을 바꾼 앱 릴리스보다 늦지 않게 올린다.
- 올리는 커밋에서 할 일: `Dockerfile` 의 기본값 한 줄을 바꾸고, 로컬에서 빌드해 띄워 `index.json` 과 파일 하나를 받아 본다(`docker compose up -d --build`, 패키지 폴더는 앱 저장소 `server/test/fixtures/market/packages` 의 사본으로 충분하다). 그 뒤 커밋·push 한다.
- 이 값은 `Dockerfile` 한 곳에만 둔다. compose 의 `build.args` 에 기본값을 겹쳐 적지 않는다(두 곳이 어긋난다). 서버에서 잠깐 다른 커밋을 써야 하면 서버의 `compose.override.yaml` 의 `build.args` 로 덮는다.

## Komodo Stack 설정

| 항목 | 값 |
| --- | --- |
| Name | 마켓용 이름(앱 Stack 과 다르게 — compose project 이름이 갈린다) |
| Source | Git Repo — 이 저장소, `main` |
| Run Directory | 저장소 맨 위(비워 두거나 `.`) |
| File Paths | 한 줄씩 이 순서로: `compose.yaml`, `compose.override.yaml`. `COMPOSE_FILE` 은 쓰지 않는다 |
| Environment | 아래 표 |
| Webhook | 켬 — 이 저장소의 push 는 서버 구성이나 `KEYRING_REF` 를 바꾼 것뿐이라 다시 빌드할 이유가 있다. 문서만 바꾼 push 는 같은 이미지가 나와 컨테이너를 다시 만들지 않는다. 패키지 갱신은 push 가 아니라 서버 폴더에서 한다(아래 「갱신 절차」) |
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
2. 마켓 이미지로 임시 폴더를 검사한다. `pkg check` 는 폴더 경로를 보지 않으므로 아무 자리에 마운트해도 된다. 오류면 종료 코드 `1` 이다 — 고친 뒤 다시 본다.

   ```bash
   docker run --rm -v <임시 판 폴더>:/check:ro keyring-notes-market:local node server/dist/cli.js pkg check /check
   ```

   잘못된 판을 그대로 옮기면 서버는 마지막으로 성공한 `index.json` 을 계속 내준다. 그 사이 다른 새 판도 보이지 않으므로 옮기기 전에 검사한다.

3. `mv` 로 `<패키지 폴더>/keyring/<name>/<version>/` 에 옮긴다. 같은 디스크 안의 `mv` 는 한 번에 끝나 반쯤 복사된 판이 index 에 잡히지 않는다.
4. `MARKET_REBUILD_SECONDS`(기본 60초) 안에 index 가 다시 만들어진다. `https://keyring-notes-marketplace.develma.com/index.json` 에 새 판이 보이는지 본다. 안 보이면 `docker compose logs market` 에서 이유를 본다.

**이미 낸 판의 파일은 바꾸지 않는다.** 잠금이 그 판의 sha256 을 모든 기기에 고정해 두었다. 고칠 것은 새 판으로 낸다. 판 폴더를 지우는 것도 그 판을 잠근 기기의 설치를 깨므로 하지 않는다.
