<!-- source: docs/manual/en/how-to/check-and-index-packages.md @ 2026-11-11 -->
# 패키지 검사하고 목록 만들기

`keyring-market` 명령줄 도구로 패키지 판을 검사하고 마켓 저장소의 `index.json` 을 만드는 방법입니다.

패키지를 만드는 분, 그리고 마켓 서버 이미지 대신 정적 호스트에 저장소를 올리는 분을 위한 문서입니다.

> [!NOTE]
> 패키지 형식은 Keyring Notes 저장소의 [마켓 패키지 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md)에 있습니다.

## 준비물

- Node.js 22.13 이상.
- pnpm 10. 이 저장소가 정한 버전을 받으려면 `corepack enable` 을 한 번 실행하세요.
- Git.
- 설치하는 동안 `github.com` 과 npm 레지스트리에 접속할 수 있어야 합니다. 설치할 때 Keyring Notes 저장소의 한 커밋에서 패키지 검사 코드를 받습니다.

## 명령줄 도구 설치하기

1. 이 저장소를 클론하고 의존성을 설치합니다.

   ```bash
   git clone https://github.com/jang2162/keyring-notes-marketplace.git
   cd keyring-notes-marketplace
   pnpm install
   ```

2. 시험용 패키지 하나를 검사해 설치를 확인합니다.

   ```bash
   pnpm --silent keyring-market check test/fixtures/market/packages/me/clock/1.0.0
   ```

   ```text
   OK: @me/clock@1.0.0 (widget)
   ```

`--silent` 를 빼면 pnpm 이 결과 앞에 실행하는 스크립트도 보여 줍니다.

명령은 클론 폴더나 그 안의 어느 폴더에서든 실행합니다. 상대 경로는 명령을 실행한 폴더 기준입니다. 다른 폴더에서는 `-C` 로 클론 폴더를 가리키세요.

```bash
pnpm --silent -C ~/keyring-notes-marketplace keyring-market check packages/me/clock/1.0.0
```

## 패키지 검사하기

```bash
pnpm keyring-market check my-repo/packages/me/clock/1.0.0
```

`check <폴더>` 는 판 폴더 하나를 검사합니다.

- 매니페스트, 필수·허용 파일.
- 테마 색, 언어 키, 위젯 메시지 키.
- `frame.js` 문법. `frame.js` 를 실행하지는 않습니다.

오류가 있으면 이유를 보여 주고 종료 코드 `1` 로 끝납니다.

```text
Error: The package is invalid (no_manifest)
```

경고는 검사를 실패시키지 않습니다. 경고마다 `warning:` 으로 시작하는 줄 하나로 나옵니다. 빠진 언어 키, 모르는 테마 토큰, 낮은 대비, 버려진 위젯 메시지 키, 큰 `frame.js`, 너무 긴 표시 필드가 여기에 듭니다.

## 목록 만들기

```bash
pnpm keyring-market index my-repo --name "My widgets"
```

```text
index.json written — packages: 1, versions: 2 (/home/me/my-repo/index.json)
```

`index <폴더>` 는 `my-repo/packages/<scope>/<name>/<version>/` 아래 모든 판을 읽어 `my-repo/index.json` 을 씁니다.

- 모든 판을 검사하고, 첫 오류에서 멈춥니다. 오류에 그 폴더가 나옵니다.
- 파일마다 크기와 체크섬을 재고, 매니페스트마다 표시 필드를 옮겨 씁니다.
- 기존 `index.json` 의 `name` 을 지킵니다. 없으면 `--name`, 그것도 없으면 폴더 이름을 씁니다.
- 파일이 그대로면 `index.json` 을 건드리지 않고 `index.json unchanged` 를 보여 줍니다.

상한을 넘는 표시 필드는 자르지 않고 `index.json` 에서 뺍니다. 이때 `warning: @me/clock@1.0.0: display_too_long: description.en` 같은 경고를 보여 주고, 종료 코드는 그대로 `0` 입니다.

목록을 만든 뒤 폴더 전체를 정적 호스트에 올리세요.

## 저장소 내주기

내 컴퓨터에서 저장소를 시험하려면 Docker 이미지가 띄우는 것과 같은 서버로 내주세요.

```bash
pnpm keyring-market serve my-repo
```

```text
Serving the marketplace repository at http://127.0.0.1:8080/index.json
```

서버는 시작할 때와 60초마다 `index.json` 을 다시 만듭니다. `/index.json` 과 패키지 파일만 내줍니다. 멈추려면 `Ctrl+C` 를 누르세요.

| 옵션 | 환경 변수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `--host <address>` | `MARKET_HOST` | `127.0.0.1` | 받을 주소 |
| `--port <port>` | `MARKET_PORT` | `8080` | 받을 포트 |
| `--rebuild-seconds <seconds>` | `MARKET_REBUILD_SECONDS` | `60` | `index.json` 을 다시 만드는 주기. `0` 이면 시작할 때 한 번만 만듭니다 |
| `--name <name>` | `MARKET_NAME` | 폴더 이름 | 저장소 이름. 아직 `index.json` 이 없을 때 씁니다 |

옵션이 환경 변수보다 앞섭니다. 다른 사람에게 내주는 서버는 [내 마켓플레이스 운영하기](run-a-marketplace.md)의 Docker 이미지로 띄우세요.

## Docker 에서 실행하기

마켓 서버 이미지에는 `keyring-market` 과 같은 명령줄 도구가 들어 있습니다. Docker Compose 에서는 다음과 같이 실행합니다.

```bash
docker compose exec market keyring-market check /srv/market/packages/me/clock/1.0.0
```

아직 마운트하지 않은 폴더는 새 컨테이너에 마운트해 검사합니다.

```bash
docker run --rm -v /srv/my-market/incoming/1.2.0:/check:ro keyring-notes-market:local keyring-market check /check
```

## 출력 언어 고르기

명령줄 도구는 기본으로 영어로 보여 줍니다. 한국어로 보려면 `KEYRING_LANG=ko` 를 주세요.

```bash
KEYRING_LANG=ko pnpm --silent keyring-market check my-repo/packages/me/clock/1.0.0
```

```text
통과: @me/clock@1.0.0 (widget)
```

`KEYRING_LANG` 이 없으면 `LANG` 을 따릅니다.

## 다음 단계

- [내 마켓플레이스 운영하기](run-a-marketplace.md)
- [마켓 패키지 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md)(Keyring Notes 저장소)
