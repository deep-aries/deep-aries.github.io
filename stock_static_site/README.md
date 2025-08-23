
# Static Stock Dashboard (Snapshot)

이 폴더는 GitHub Pages에 바로 올릴 수 있는 **정적 사이트** 스냅샷입니다.

## 배포(2가지 방법)

### 1) `username.github.io` 저장소로 배포
1. GitHub에서 `USERNAME.github.io` 라는 새 공개 저장소를 만듭니다.
2. 아래 파일들을 저장소 루트에 업로드합니다: `index.html`, `market.json`, `future.json`
3. 푸시 후, https://USERNAME.github.io 에 접속하면 바로 페이지가 열립니다.

### 2) 기존 저장소의 `gh-pages` 브랜치로 배포
1. 아무 저장소나 선택하고, `Settings > Pages`에서 **Branch**를 `gh-pages`로 지정합니다.
2. `gh-pages` 브랜치를 생성하고, 이 폴더의 파일들을 브랜치 루트에 커밋/푸시합니다.
3. GitHub Pages가 빌드되면, 설정 화면에 표시된 URL로 접속합니다.

## 커스터마이즈
- `market.json`, `future.json` 데이터를 새로 갱신해서 커밋하면, 서버 없이도 페이지가 최신 스냅샷을 보여줍니다.
- 외부 API 호출이 없으므로 **무료**로 안전하게 운영할 수 있습니다.

