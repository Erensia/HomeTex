# 2026-11-05 배포 후 흰 화면 (옛 JS 번들 요청 실패) 사건 기록

| 항목 | 내용 |
|---|---|
| 발생일 | 2026-11-05 |
| 영향 | `https://home-tex.vercel.app`을 Chrome 탭에서 열면 흰 화면 (v1.0.1 릴리스 직후) |
| 상태 | 해결됨 (사용자 Chrome의 서비스 워커·캐시 정리). 코드 수정 없음 |
| 원인 | 서비스 워커/캐시가 **릴리스 이전 빌드의 `index.html`**을 계속 사용했고, 그 파일이 가리키는 옛 JS 번들이 새 배포로 서버에서 사라짐. `vercel.json`의 전체 rewrite 때문에 서버가 404 대신 `index.html`(`text/html`)을 돌려줘 MIME 오류가 남 |
| 데이터 손실 | 없음 (앱 코드가 실행되기 전에 실패해 localStorage를 읽거나 쓰지 않음) |
| 관련 버전 | 직전 프로덕션 `8f6f63e` → 릴리스 `ef7caa4` (v1.0.1) |

---

## 1. 증상

- 배포(Vercel)는 "완료"로 표시되는데 페이지를 열면 흰 화면만 보임.
- 브라우저 콘솔 오류:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the
server responded with a MIME type of "text/html". Strict MIME type checking is
enforced for module scripts per HTML spec.
```

- 오류가 가리킨 파일: `index-Csyc6p18.js:1` (이전 프로덕션 `8f6f63e`의 번들 이름. 현재 번들은 `index-BhPwfywU.js`).

## 2. 사건 경과

시각은 대부분 2026-11-05 한국 시간 기준 오후입니다(배포 `ef7caa4`는 07:41 UTC = 16:41 KST).

| 순서 | 내용 |
|---|---|
| 1 | v1.0.1을 `dev` 브랜치에서 구현하고 `npm test`·`npm run build` 통과 확인 후 push. |
| 2 | 릴리스 직전 `git fetch`로 확인해 보니 로컬 `main`(`a46440f`)이 GitHub `main`(`8f6f63e`)보다 뒤처져 있었음. 원격에만 있던 "디자인 전면 개편" 커밋 5개와 `dev`가 5개 파일에서 충돌. |
| 3 | 사용자 결정("dev 디자인 우선")에 따라 `origin/main`을 `dev`에 병합(충돌은 dev 쪽 채택, 다크 모드 제거, main의 비디자인 변경 유지)하고 `dev`를 `main`으로 fast-forward push(`ef7caa4`). |
| 4 | 사용자가 Vercel 배포 완료 후 접속했더니 흰 화면. 원인 조사 시작. |
| 5 | 사용자가 "Vercel 기본 도메인이 `home-tex.vercel.app`에서 `home-tex-erensia.vercel.app`으로 바뀐 것 같다"고 제보. |
| 6 | 새 도메인은 Vercel 로그인으로 리디렉션됨을 확인(아래 3장). 하지만 사용자가 쓰는 주소는 `home-tex.vercel.app`이고 Chrome 탭이라 도메인 가설은 기각. |
| 7 | 사용자가 콘솔 오류(MIME `text/html`)를 제공 → `vercel.json`의 전체 rewrite와 연결. |
| 8 | 사용자가 요청 파일 이름(`index-Csyc6p18.js`)을 제공 → 릴리스 이전 빌드의 번들로 확정. |
| 9 | 사용자가 서비스 워커 Unregister, Cache Storage 삭제, 강력 새로고침으로 복구. |

## 3. 조사에서 확인한 것 (가설별 결과)

| 가설 | 확인 방법 | 결과 |
|---|---|---|
| 새 빌드 코드가 깨짐 | 새 형식 데이터를 넣고 프로덕션 빌드의 모든 경로(홈·월별·요약·설정·백업) 렌더 확인 | 정상 |
| 실제 프로덕션 서버 문제 | `https://home-tex.vercel.app`의 `index.html`·JS·CSS·`manifest`·`sw.js` 응답과 번들 내용을 로컬 빌드와 비교. Chrome 자동화로 열기 | 정상, 로컬 빌드와 동일, 콘솔 오류 없음 |
| 서비스 워커 업그레이드 실패 (이전 빌드 → 새 빌드) | 이전 프로덕션을 로컬에서 다시 빌드해 같은 브라우저 프로필에서 새 빌드로 교체, 재로드 | 정상으로 업그레이드됨 (재현 안 됨) |
| 구 형식 데이터(`cards.*`) 호환 | 구 형식 localStorage로 프로덕션 빌드 열기 | **초기 설정 화면**이 나옴(흰 화면 아님). 별도 이슈, 아래 6장 |
| 도메인 변경 | `home-tex-erensia.vercel.app` 응답과 리디렉션 경로 확인 | 302 → `vercel.com/sso-api` → 307 → 로그인 페이지(Vercel Authentication). Chrome에서도 자동 리디렉션됨. 사용자가 쓰는 `home-tex.vercel.app`과 무관해 기각 |
| 옛 번들 파일이 서버에서 사라졌는지 | `curl`로 옛 번들 이름과 존재하지 않는 이름을 요청 | 둘 다 200 `text/html` (rewrite가 `index.html`을 돌려줌). 오류 메시지와 정확히 일치 |
| 요청 파일이 이전 프로덕션의 번들인지 | `8f6f63e`를 로컬에서 빌드해 번들 이름 비교 | `index-Csyc6p18.js`로 일치 |

## 4. 원인

**확정된 부분**
1. 배포마다 JS 번들 이름(해시)이 바뀌고, 새 배포가 올라가면 이전 번들은 서버에서 사라집니다.
2. `vercel.json`이 `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`라서, 서버에 없는 파일(옛 번들)을 요청하면 404가 아니라 `index.html`을 200 `text/html`로 돌려줍니다. 모듈 스크립트는 MIME 검사가 엄격해 이 응답을 거부하고, 앱이 실행되지 않아 흰 화면이 됩니다.
3. Chrome이 사용한 `index.html`은 릴리스 이전 빌드의 것이었습니다(요청한 파일이 `index-Csyc6p18.js`).

**추정 (직접 확인 못 함)**
- 새 서비스 워커가 활성화되면서 옛 precache를 정리(`autoUpdate`의 기본 동작)했는데, 화면에는 옛 `index.html`이 남아 있어(탭이 열려 있었거나 캐시된 문서) 사라진 옛 번들을 새로 요청한 서비스 워커 캐시의 **버전 불일치(version skew)**로 보입니다. 사용자의 Chrome 서비스 워커 상태를 직접 볼 수 없었고 로컬 재현도 되지 않아 정확한 타이밍은 단정하지 못했습니다.

**원인이 아닌 것**: v1.0.1 코드, 데이터 형식(새 형식), `home-tex-erensia.vercel.app` 도메인 변경.

## 5. 해결 방법

사용 중인 사이트(`home-tex.vercel.app`)의 Chrome 탭에서 다음을 합니다. **가계부 데이터(Local Storage)는 지워지지 않습니다.**

1. F12 → **Application** → **Service Workers** → **Unregister**
2. **Cache Storage**에서 항목을 전부 삭제
3. `Ctrl+Shift+R`(강력 새로고침)

> **하지 말 것**: "Clear site data", "웹사이트 데이터 삭제", 앱/사이트 삭제. 가계부 데이터는 이 브라우저의 localStorage에만 있어서 함께 지워집니다. 홈 화면(PWA) 앱이나 다른 기기에서도 같은 증상이면 각각 따로 처리해야 합니다.

## 6. 재발 시 진단 순서

1. **콘솔 오류 확인.** 위 MIME 오류인가? 오류가 가리키는 **파일 이름**을 확인한다.
2. 그 이름이 현재 프로덕션 번들인가? 현재 번들 이름은 아래로 확인한다.
   ```bash
   curl -s https://home-tex.vercel.app/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
   ```
3. 요청한 파일이 현재 번들과 **다르면** 이 문서와 같은 사건이다. 5장으로 복구한다.
4. 서버 응답을 확인한다. 옛 이름이 200 `text/html`이면 rewrite 때문이다.
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://home-tex.vercel.app/assets/<파일이름>
   ```
5. 파일 이름이 **현재 번들과 같은데도** 오류가 나면 다른 원인이다. 새 코드 오류와 서버 설정부터 다시 본다.

## 7. 재발 방지 후보 (미적용)

사용자 결정(2026-11-05): 지금은 적용하지 않고, 다음 버전 작업 후 배포했을 때 같은 문제가 재발하면 그때 수정한다.

**2026-11-09 갱신:** iPhone 홈 화면 앱에서는 개발자도구가 없어 5장 복구 절차를 쓸 수 없고, 앱을 삭제하면 localStorage 데이터까지 사라진다는 점을 근거로 아래 1·2번을 `dev`에 적용했습니다(SPEC.md 6.6). 3번은 보류입니다.
- 1번 적용: `vercel.json` rewrite가 `/assets/…`와 확장자가 있는 경로를 제외합니다.
- 2번 적용: `index.html` 인라인 스크립트가 **엔트리 스크립트**의 로드 실패를 감지해 서비스 워커·캐시를 비우고 1회 새로고침합니다. (Vite의 `vite:preloadError`는 동적 import 전용이라 이 사건의 엔트리 스크립트 실패에는 쓸 수 없습니다.) 임시 서버로 사라진 번들 상황을 재현해 헤드리스 Chrome에서 1회 새로고침이 일어나는 것을 확인했습니다. 실제 iPhone 서비스 워커 환경은 아직 검증하지 못했습니다.

| 후보 | 내용 | 기대 효과 |
|---|---|---|
| `vercel.json` rewrite 수정 | `/assets/…` 등 파일 요청은 `index.html`로 돌리지 않음 | 없는 번들이 404로 명확히 실패해 원인이 바로 보임 (캐시 복구 자체는 아님) |
| 옛 번들 로드 실패 시 자동 복구 | 로드 실패를 감지하면 서비스 워커 해제 후 한 번 새로고침 | 사용자가 직접 캐시를 지우지 않아도 스스로 복구 |
| 서비스 워커 업데이트 방식 점검 | `autoUpdate` 동작과 새로고침 시점 확인 | 근본 원인 완화 |

## 8. 같은 날 발견된 별도 이슈

| 이슈 | 내용 | 조치 |
|---|---|---|
| 릴리스 전 `main` 불일치 | 로컬 `main`이 GitHub `main`보다 뒤처져 있어 릴리스 직전에 충돌이 발견됨 | 규칙 추가: **작업 시작 전에 항상 로컬 `main`과 `origin/main` 동기화부터 확인** (메모리 `main-sync-first`) |
| 구 형식 데이터 호환 | `origin/main`의 `ee6ec7d`가 구 형식(`cards.*`) 이관 코드를 제거해, 구 형식 데이터가 저장된 브라우저는 초기 설정 화면이 뜸. 실사용 데이터는 이미 새 형식이라 영향 없음 | 미조치. 필요하면 별도 검토 |
| 새 도메인 보호 | `home-tex-erensia.vercel.app`은 Vercel Authentication이 걸려 있어 로그인 없이는 접근 불가 | 미조치. 새 도메인을 쓰려면 Vercel 설정에서 보호 해제 필요. localStorage는 도메인별이라 데이터를 옮기려면 백업 JSON 내보내기/가져오기 사용 |

## 9. 배운 점

- 흰 화면 + MIME `text/html` 오류는 **"없는 JS 파일 요청"**이라는 신호다. 먼저 요청한 파일 이름이 현재 번들과 같은지 본다.
- 이 앱은 서비스 워커를 쓰는 SPA라서, 배포 직후 기존 방문자가 옛 `index.html`로 열리면 같은 일이 생길 수 있다.
- 도메인, 데이터, 코드 가설을 먼저 파고들기보다 **콘솔 오류와 요청 파일 이름**을 먼저 받는 것이 가장 빠른 단서였다.
