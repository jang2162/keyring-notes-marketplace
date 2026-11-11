<!-- source: README.md @ 2026-11-11 -->
<p align="center"><a href="README.md">English</a> | <b>한국어</b></p>

<h1 align="center">keyring-notes-marketplace</h1>

<p align="center">내 Keyring Notes 위젯·테마·언어를 마켓 저장소로 내주는 Docker 구성</p>

## 소개

Keyring Notes 는 마켓 저장소에서 위젯·테마·언어를 설치합니다. 마켓 저장소는 `index.json` 이 든 정적 파일 폴더입니다.
이 저장소는 패키지 폴더에서 `index.json` 을 다시 만들고, 앱이 기대하는 대로 파일을 내주는 작은 서버를 빌드합니다.
같은 코드를 `keyring-market` 명령줄 도구로도 써서, 패키지를 검사하고 정적 호스트에 올릴 `index.json` 을 만들 수 있습니다.
패키지 검사 코드는 [Keyring Notes 저장소](https://github.com/jang2162/keyring-notes)의 정한 커밋에서 받고, 패키지는 서버의 폴더에 둡니다.
내 마켓을 공개로 또는 집 안 네트워크에서 운영하는 분, 그리고 공식 마켓 운영자를 위한 것입니다.

## 주요 기능

- 시작할 때와 60초마다 `index.json` 을 다시 만들어, 새 판이 다시 시작하지 않아도 보입니다.
- 잘못된 패키지가 있으면 마지막으로 성공한 `index.json` 을 그대로 두고 이유를 로그에 남깁니다.
- 파일을 압축하지 않고 바이트 그대로, 앱이 기대하는 캐시 헤더와 함께 내줍니다.
- 패키지 폴더를 읽기 전용으로 마운트하므로, 이미지에는 패키지가 들어가지 않습니다.
- `keyring-market check`·`index` 로 판 폴더를 검사하고 `index.json` 을 만듭니다. 출력과 종료 코드는 Keyring Notes 의 `keyring pkg` 와 같습니다.
- 옛 Docker 빌더로 빌드되므로 BuildKit(`docker buildx`)이 없어도 됩니다.

## 설치

준비물: Compose v2 가 있는 Docker. 이미지를 빌드하는 동안 `github.com` 과 npm 레지스트리에 접속할 수 있어야 합니다.

```bash
git clone https://github.com/jang2162/keyring-notes-marketplace.git
cd keyring-notes-marketplace
cp .env.example .env
```

Compose 구성을 확인합니다.

```bash
docker compose config --services
```

```text
market
```

## 빠른 시작

1. 패키지 폴더를 만듭니다. 패키지는 그 안에 `<scope>/<name>/<version>/` 꼴로 둡니다.

   ```bash
   mkdir -p packages
   ```

2. 서버를 빌드해 띄웁니다. 첫 빌드는 몇 분 걸립니다.

   ```bash
   docker compose up -d --build
   ```

3. index 를 읽습니다.

   ```bash
   curl http://127.0.0.1:8080/index.json
   ```

   폴더가 비어 있으면 결과는 이렇습니다.

   ```json
   {
     "format": 1,
     "name": "Keyring Notes",
     "packages": {}
   }
   ```

앱에 HTTPS 로 내주기, 클론 없이 빌드하기, Keyring Notes 버전 고정하기는 [내 마켓플레이스 운영하기](docs/manual/ko/how-to/run-a-marketplace.md)를 보세요.

## 설정

`.env` 에 적습니다.

| 항목 | 기본값 | 설명 |
| --- | --- | --- |
| `MARKET_PACKAGES` | `./packages` | 패키지가 든 호스트 폴더. 읽기 전용으로 마운트합니다. |
| `MARKET_BIND` | `127.0.0.1` | 포트를 묶을 호스트 주소. |
| `MARKET_PORT` | `8080` | 호스트 포트. |
| `MARKET_REBUILD_SECONDS` | `60` | `index.json` 을 다시 만드는 주기(초). |
| `MARKET_NAME` | `Keyring Notes` | 앱에 보이는 저장소 이름. |

## 문서

- [내 마켓플레이스 운영하기](docs/manual/ko/how-to/run-a-marketplace.md)
- [패키지 검사하고 목록 만들기](docs/manual/ko/how-to/check-and-index-packages.md)
- [마켓 패키지 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md)(Keyring Notes 저장소)

## 라이선스

MIT License. 자세한 내용은 [LICENSE](LICENSE)를 보세요.
