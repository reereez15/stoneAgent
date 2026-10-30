# stoneAgent 재현 기록과 릴리스 기록 (22단계)

이 문서는 제출 커밋을 **원래 작업 폴더가 아닌 새 폴더**에서 받아 실행해 본 기록입니다.
아래 내용은 학생이 직접 수행하고 관찰한 진술입니다. 서버나 AI가 새 환경에서 실행해 확인한 결과가 아닙니다.

## 1. 대상 저장소와 커밋

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/reereez15/stoneAgent |
| 브랜치 | main |
| 재현한 커밋 | `b52c55c2b1eb4a83c73535410dc0cda64483f590` (보안 Agent 21단계: 학생 실행 설명서와 구성도) |
| 앱 버전 | `on-client/package.json` → alekov-client-starter 0.2.11 |

### 이 문서 커밋과의 관계

재현은 위 커밋 `b52c55c`를 대상으로 했습니다. 이 문서(`docs/STUDENT_RELEASE_NOTES.md`)를 추가한
22단계 커밋은 **문서 한 개만 추가**하며 코드·실행 진입점·의존성은 바꾸지 않습니다.
따라서 위 재현 결과는 이 문서 커밋에서도 그대로 유효합니다.
서로 다른 커밋에서 얻은 결과를 합쳐 "최종 버전 전체 성공"으로 적지 않았습니다.

## 2. 재현 환경

| 항목 | 값 |
|---|---|
| 운영체제 | Windows (PowerShell) |
| Node.js | v24.19.0 (`node -v`로 확인. `package.json`의 `engines.node`와 일치) |
| npm 설치 | 하지 않음. 외부 의존성이 없어 `node_modules` 없이 실행됨 |
| 재현 폴더 | `C:\Users\user\stoneAgent-verify` (원래 작업 폴더 밖의 새 빈 폴더) |
| 포트 | 5199 (원래 폴더 서버의 5189과 겹치지 않게 `-Port`로 지정) |
| 복사한 설정 | 없음. `.env`, 호스트 설정(`native.json`) 모두 복사하지 않음 |

## 3. 재현 절차와 관찰 결과

재현 날짜: 2026-10-30 (현지 시각 기준 오전)

| 순서 | 실행한 것 | 관찰 결과 |
|---|---|---|
| 1 | 원래 폴더에서 `git status`, `git log` | `working tree clean`, 최신 커밋 `b52c55c`, 커밋 72개 그대로 보존됨 |
| 2 | 새 폴더에 `git clone` 후 `git checkout b52c55c…` | `HEAD detached at b52c55c`, 해시 일치, `working tree clean` |
| 3 | 받은 파일 확인 | `on-client`에 docs·public·src·student·tools·vendor, `.env.example`, `package.json`, `README.md`. `student/extension.mjs` 62,222바이트 |
| 4 | `Test-Path on-client\.env` | **False** — 비밀 설정은 커밋에 없음 |
| 5 | `Test-Path on-client\node_modules` | **False** — 설치 없이 실행 가능 |
| 6 | `Test-Path on-client\docs\STUDENT_RUNBOOK.md` | **True** — 21단계 문서 포함 |
| 7 | `node -v` | `v24.19.0` |
| 8 | `.\tools\start-alekov.ps1 -Port 5199` | 설치 과정 없이 기동. 시작 메시지 4줄이 21단계 설명서와 일치(주소만 5199) |
| 9 | 브라우저에서 `http://127.0.0.1:5199` | 세 메뉴와 학생 칸이 모두 표시됨 |
| 10 | 학생 칸 전체 확인 | 8개 칸 모두 **대기 문구가 아닌 구현된 화면**이 표시됨 |
| 11 | `Ctrl + C`로 종료 후 같은 명령으로 재실행 | 같은 화면으로 다시 기동됨 |

### 관찰된 오류

연동 시스템(판정 어댑터)에 연결되지 않아 생기는 오류만 나왔습니다. 재현 실패가 아닙니다.

- 화면 상단 「연결 없음」
- 각 자료에 `기존 서버·에이전트의 연결을 확인할 수 없습니다. 연결 어댑터를 먼저 확인하세요.`
- 제공 칸의 「확인 불가 (요청 실패)」와 학생 칸의 실패 안내가 같은 뜻으로 표시됨

새 폴더에는 `.env`와 호스트 설정을 복사하지 않았으므로 예상된 결과입니다.
이 상태에서도 학생 함수는 모두 호출되어 실패 안내를 구분해 표시했습니다.

## 4. 단계별 기능과 확인 결과

"실제 연결"은 연동 시스템·AI 게이트웨이에 실제로 연결해 확인한 것, "예제(demo)"는 `-Demo`로 켠 예제 자료,
"모의 입력"은 코드에 직접 값을 넣어 점검한 것을 뜻합니다. 아래 확인은 원래 작업 폴더에서 수행했습니다.

| 단계 | 기능 | 확인 방식 | 결과 |
|---|---|---|---|
| 13 | `renderIdentity` 사용자·기기·세션 | 예제(demo) + 서버 종료 | 표시·교체·실패 시 이전 값 제거 확인 |
| 13 | 사용자 교체, 상태 분기 | 모의 입력 | 확인 |
| 14 | `renderDecision` 접속 판정 | 예제(demo) | allow·deny·challenge와 요청 실패 구분 확인 |
| 14 | `unknown` 판정 | 모의 입력 | 확인. 예제 자료에 해당 값 없음 |
| 15 | `renderEvents` 목록·상세 | 예제(demo) | 목록·상세·다시 불러오기 시 상세 초기화 확인 |
| 15 | 여러 건 필터, 빈 배열, 형식 불일치 | 모의 입력 | 확인. 예제 자료는 기록 1건뿐 |
| 16 | `renderStatus` 알림·기기·세션·도움정보 | 예제(demo) + 서버 종료 | 표시·실패 구분·복사 6값 확인, 자동 재요청 없음 |
| 16 | 빈 목록, 시간 초과, 미지원 조치 버튼 | 모의 입력 | 확인 |
| 17 | `renderAiConnection` 점검 전·실패 | 실제 연결 시도 | 점검 전 상태와 실패 안내 확인 |
| 17 | `ok(test/verified)`, 오류 코드 분류 | 모의 입력 | 확인 |
| 18 | `renderExplanation` 실패 시 기록 보존 | 실제 연결 시도 | AI 실패해도 기록·업무 앱 판정 정상 동작 확인 |
| 18 | 설명 성공, 근거 불일치 거부 | 모의 입력 | 확인 |
| 19 | `renderAction` 지원 조치 없음 | 예제(demo) | 「아직 미실행(idle)」과 버튼 없음 확인 |
| 19 | `prepared`~`expired` 전 상태 | 모의 입력 | 확인 |
| 20 | `renderVulnerabilities` 조회 결과 | 실제 조회 | `not_configured` 표시, 재조회 시 새 요청 확인 |
| 20 | `complete`·`partial`·`unverifiable` | 모의 입력 | 확인 |
| 21 | 실행 설명서와 구성도 | 실제 실행 대조 | 경로·명령·시작 메시지 일치 확인 후 문서 수정 |
| 22 | 새 폴더 재현 | 실제 실행 | 3절 표 참조 |

## 5. 미확인·미완료 항목

| 항목 | 상태 | 원인 |
|---|---|---|
| AI 연결 완료와 실제 사건 설명 호출 | 미완료 | AI 앱 승인 단계에서 `ALEKOV_CONNECT_RESPONSE_INVALID`. 운영 측 게이트 준비 필요 |
| 계정 연결 | 설정 필요 | `NATIVE_HOST_DISABLED`는 `-NativeHostConfig` 지정으로 해소됨. 재현 폴더에서는 설정하지 않음 |
| 19단계 실제 집행 | 미완료 | 보안 조치 처리 연결이 준비되지 않음. 기록의 `supportedActions`가 빈 배열 |
| OSV 실제 조회, lock 버전 대조 | 미확인 | 허용 공개 패키지 목록이 비어 `PROJECT_NOT_CONFIGURED` |
| 패키지 조회 취소 | 미확인 | 응답이 즉시 끝나 `loading` 구간에서 버튼을 누를 수 없음 |
| 재현 폴더에서 연동 시스템 연결 | 미확인 | 설정을 복사하지 않음. 의도된 범위 |
| Windows 외 운영체제, 다른 Node 버전 | 미지원·미확인 | 실행 스크립트가 PowerShell 전용 |

확인하지 않은 동작을 확인했다고 적지 않았습니다.

## 6. 데이터 보존·백업·복원

### 보존 대상과 위치

| 자료 | 위치 | 저장소 포함 |
|---|---|---|
| 학생 코드 | `on-client/student/extension.mjs` | 포함 |
| 학생 문서 | `on-client/docs/STUDENT_RUNBOOK.md`, `STUDENT_RELEASE_NOTES.md` | 포함 |
| 단계별 이력 | Git 커밋(1~12단계, 보너스 xdr, 13~22단계) | 포함 |
| 비밀 설정 | `on-client/.env` | **제외**(`.gitignore`). 예시는 `.env.example` |
| 호스트 설정 | 프로젝트 밖(예: `C:\Users\user\alekov-host\native.json`) | **제외**(프로젝트 밖) |
| 설치물 | `node_modules/`, `.vercel/` | 제외 |

### 백업

- 원격 저장소 `origin`(GitHub)에 `git push`하는 것이 기본 백업입니다.
- 단계마다 커밋하므로 이전 상태로 되돌릴 수 있습니다.
- 비밀 설정은 저장소에 올리지 않으므로 별도 보관해야 합니다. 분실 시 담당자 안내에 따라 다시 발급받습니다.

### 복원

```powershell
git clone https://github.com/reereez15/stoneAgent.git
cd stoneAgent\on-client
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

복원 절차의 제한은 다음과 같습니다.

- 코드와 문서는 복원되지만 `.env`와 호스트 설정은 복원되지 않습니다. 연동 시스템 연결은 설정을 다시 준비해야 합니다.
- 이 문서 3절의 재현이 그 복원 절차를 실제로 따라 한 기록입니다.

## 7. 버전과 지원 범위

| 항목 | 값 |
|---|---|
| 버전 상태 | **검증 중인 버전**. 운영 인증이나 v1.0이 아닙니다 |
| 근거 | 5절의 미완료 항목(AI 연결, 실제 집행, OSV 실제 조회)이 남아 있음 |
| 지원 환경 | Windows + PowerShell, Node.js 24.19.0, 로컬 실행(127.0.0.1) |
| 지원하지 않음 | 원격 배포, Windows 외 운영체제, 다른 Node 메이저 버전 |

### 시연·진술·원문 확인의 구분

- **학생 진술**: 이 문서의 재현 기록과 관찰 결과. 학생이 직접 실행하고 적은 내용입니다.
- **원문 확인**: 서버의 AI가 제출 커밋의 코드와 문서를 읽고 서로 맞는지 판정하는 것입니다.
- **실제 실행 검증**: 서버가 이 명령들을 실행해 확인하지는 않습니다.

AI 원문 검토 통과는 실행 성공의 증명이 아닙니다. 22단계 통과는 원문 검토 기준의 수료이며,
실제 운영 인증이나 v1.0 자동 인증이 아닙니다.
