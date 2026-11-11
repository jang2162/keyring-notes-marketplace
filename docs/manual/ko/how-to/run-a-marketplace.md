<!-- source: docs/manual/en/how-to/run-a-marketplace.md @ 2026-11-11 -->
# 내 마켓플레이스 운영하기

마켓 저장소를 Docker 로 띄우고 Keyring Notes 에 더하는 방법입니다.

자기 위젯·테마·언어를 공개로 또는 집 안 네트워크에서 나누는 분을 위한 문서입니다.

> [!NOTE]
> 앱에서 내 저장소의 패키지를 설치하는 방법은 [패키지 설치하기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/install-packages.md)를 보세요.

패키지 자체를 만드는 방법은 Keyring Notes 저장소의 [마켓 패키지 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md)에 있습니다.

## 올릴 곳 고르기

저장소는 정적 파일 폴더라 두 가지 중에서 고릅니다.

- **아무 정적 호스팅.** 폴더에서 `pkg index` 를 실행한 뒤 올립니다. [저장소 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md#저장소-올리기)를 보세요.
- **마켓 서버 이미지.** `index.json` 을 스스로 다시 만들고 알맞은 헤더로 파일을 내줍니다. 이 문서의 나머지는 이것을 씁니다.

이미지에는 패키지가 들어 있지 않습니다. 패키지는 서버의 폴더에 두고 컨테이너에 마운트합니다.

## 준비물

- Docker. [방법 1](#방법-1-docker-compose-로-띄우기)에는 Compose v2, [방법 2](#방법-2-클론-없이-빌드하기)에는 Git 이 필요합니다.
- 이미지를 빌드하는 동안 `github.com` 과 npm 레지스트리에 접속할 수 있어야 합니다. 빌드가 Keyring Notes 소스와 의존성을 받습니다.

BuildKit(`docker buildx`)은 없어도 됩니다. 없으면 Docker 가 옛 빌더로 빌드하고 지원 중단 경고를 출력합니다.

## 패키지 폴더 꾸리기

패키지를 한 폴더 안에 `<scope>/<name>/<version>/` 꼴로 둡니다.

```text
/srv/my-market/packages/
└── me/
    └── clock/
        ├── 1.0.0/
        └── 1.1.0/
```

서버는 이 폴더를 `/srv/market/packages` 에 마운트하고, 컨테이너 안의 그 옆 자리에 `index.json` 을 씁니다.

## 방법 1: Docker Compose 로 띄우기

1. 이 저장소를 클론하고 예시 설정을 복사합니다.

   ```bash
   git clone https://github.com/jang2162/keyring-notes-marketplace.git
   cd keyring-notes-marketplace
   cp .env.example .env
   ```

2. `.env` 에서 `MARKET_PACKAGES` 를 내 패키지 폴더로 바꿉니다.

   ```bash
   MARKET_PACKAGES=/srv/my-market/packages
   ```

   기본값은 클론 안의 `./packages` 입니다. 서버를 띄우기 전에 폴더를 만들어 두세요. 없으면 Docker 가 `root` 소유의 빈 폴더로 만듭니다.

3. 서버를 빌드해 띄웁니다.

   ```bash
   docker compose up -d --build
   ```

4. `http://127.0.0.1:8080/index.json` 을 엽니다. 내 패키지가 보입니다.

서버는 시작할 때와 `MARKET_REBUILD_SECONDS` 초마다 `index.json` 을 다시 만듭니다. 그래서 새 판은 다시 시작하지 않아도 보입니다. 잘못된 패키지가 있으면 마지막으로 성공한 `index.json` 을 그대로 두고 이유를 로그에 남깁니다.

```bash
docker compose logs market
```

저장소는 `.env`, `compose.override.yaml`, `packages/` 를 무시합니다.

## 방법 2: 클론 없이 빌드하기

Docker 는 이 저장소에서 바로 이미지를 빌드할 수 있습니다.

```bash
docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git#main
```

옛 빌더에서는 Docker 명령줄이 저장소를 클론하므로, 명령을 실행하는 곳에 Git 이 있어야 합니다.

패키지 폴더를 읽기 전용으로 마운트해 컨테이너를 띄웁니다.

```bash
docker run -d --name keyring-notes-market --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /srv/my-market/packages:/srv/market/packages:ro \
  -e MARKET_NAME="My widgets" \
  -e MARKET_REBUILD_SECONDS=60 \
  keyring-notes-market
```

`http://127.0.0.1:8080/index.json` 을 엽니다. 로그는 `docker logs keyring-notes-market` 으로 봅니다.

갱신할 때는 다시 빌드하고 컨테이너를 바꿉니다.

```bash
docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git#main
docker rm -f keyring-notes-market
```

그다음 같은 `docker run` 명령을 다시 실행합니다.

## 패키지 검사하기

이미지에 Keyring Notes 명령줄이 들어 있어, Keyring Notes 클론 없이도 판 폴더를 검사할 수 있습니다. Compose 에서는 이렇게 합니다.

```bash
docker compose exec market node server/dist/cli.js pkg check /srv/market/packages/me/clock/1.0.0
```

```text
OK: @me/clock@1.0.0 (widget)
```

`docker run` 으로 띄웠다면 `docker compose exec market` 대신 `docker exec keyring-notes-market` 을 씁니다. 오류가 있으면 종료 코드 `1` 로 끝납니다. 무엇을 검사하는지는 [패키지를 검사하고 목록 만들기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md#패키지를-검사하고-목록-만들기)를 보세요.

## 새 판 더하기

1. 새 판 폴더를 패키지 폴더와 같은 디스크의 임시 폴더에 복사합니다.
2. 이미지로 검사합니다. `pkg check` 는 폴더 경로를 보지 않으므로 아무 자리에나 마운트해도 됩니다.

   ```bash
   docker run --rm -v /srv/my-market/incoming/1.2.0:/check:ro keyring-notes-market:local node server/dist/cli.js pkg check /check
   ```

   이미지 이름은 Compose 로 빌드했으면 `keyring-notes-market:local`, 방법 2 로 빌드했으면 `keyring-notes-market` 입니다.
3. 제자리로 옮깁니다. 예: `/srv/my-market/packages/me/clock/1.2.0/`. 옮기기는 한 번에 끝나므로, 서버가 반쯤 복사된 판을 읽지 않습니다.
4. `MARKET_REBUILD_SECONDS` 초까지 기다린 뒤 `index.json` 에 새 판이 보이는지 확인합니다.

> [!WARNING]
> 이미 낸 판의 파일은 바꾸지 마세요. 그 판을 설치한 기기가 체크섬을 잠가 두었으므로, 바뀐 파일은 맞지 않습니다. 고칠 것은 새 판으로 냅니다.

## Keyring Notes 버전 고르기

이미지는 Keyring Notes 저장소의 한 커밋으로 마켓 서버를 빌드합니다. `Dockerfile` 의 빌드 인자 `KEYRING_REF` 가 그 커밋입니다.

Keyring Notes 가 패키지 형식이나 마켓 서버를 바꾸면 이 저장소가 `KEYRING_REF` 를 올립니다. 다른 커밋으로 빌드하려면 전체 커밋 SHA 를 넘깁니다. Compose 에서는 `compose.override.yaml` 에 적습니다.

```yaml
services:
  market:
    build:
      args:
        KEYRING_REF: <COMMIT_SHA>
```

`docker build` 에서는 `--build-arg KEYRING_REF=<COMMIT_SHA>` 를 더합니다.

## HTTPS 뒤에 두기

Keyring Notes 는 `https:` 저장소에서만 받습니다. `http:` 와 사설망 주소는 Keyring Notes 서버 운영자가 `KEYRING_MARKET_ALLOW_HTTP`·`KEYRING_MARKET_ALLOW_PRIVATE` 로 허용했을 때만 받습니다([설정값](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/configuration.md) 참고). 데스크톱 앱은 그 기기에서 허용했을 때만 받습니다.

마켓 서버는 HTTPS 를 내주는 리버스 프록시 뒤에 둡니다. Keyring Notes 자체의 [구성 A](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/deploy-with-docker.md#구성-a-리버스-프록시-뒤)와 같습니다. `compose.override.yaml` 을 만들어 호스트 포트를 닫고 프록시 네트워크에 붙습니다.

```yaml
services:
  market:
    ports: !reset []
    networks: [proxy]
networks:
  proxy:
    external: true
    name: your-proxy-network
```

`docker run` 에서는 `-p` 를 빼고 `--network your-proxy-network` 를 더합니다.

호스트 이름을 `market` 서비스(또는 `keyring-notes-market` 컨테이너)의 `8080` 포트로 잇습니다.

> [!WARNING]
> 프록시가 응답을 압축하지 않게 하세요. Keyring Notes 는 압축된 패키지를 받지 않습니다.

## Keyring Notes 에 더하기

[공통 설정 파일](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/reference.md#공통-설정-파일)의 `marketplace.repos` 에 저장소 주소를 더합니다. 공식 저장소도 계속 쓰려면 그것을 맨 위에 둡니다.

```yaml
marketplace:
  repos:
    - url: https://keyring-notes-marketplace.develma.com/
    - url: https://market.example.com/
```

같은 패키지 id 가 두 저장소에 있으면 목록 위의 저장소가 이깁니다.

## 다음 단계

- [마켓 패키지 올리기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/publish-packages.md)
- [패키지 설치하기](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/ko/how-to/install-packages.md)
