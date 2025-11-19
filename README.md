[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/T3W3QeQp)


# Team Caffeine — 프로젝트 세팅 가이드



## 프로젝트 구조
25-team-team-caffeine/
├─ front/         # React + Vite 프론트엔드
├─ back/          # Node + Express 백엔드
└─ infra/
   └─ supabase/   # DB, 마이그레이션 관리

## 백엔드 마이그레이션 계획

1. **Express 기반 API 게이트웨이 정비**
   - `back/src/app.ts`에서 공통 미들웨어(CORS, JSON, 로깅)를 구성하고 모든 라우터를 등록합니다.
   - 라우터는 `back/src/routes`에, 도메인별 비즈니스 로직은 `back/src/controllers`에 배치합니다.

2. **도메인별 엔드포인트 이관**
   - `Supabase`에 직접 접근하던 로직(회원가입/로그인, 채팅, 목표, 펫 관리 등)을 Express 라우터 → 컨트롤러 → MySQL 계층 형태로 옮깁니다.
   - 각 컨트롤러는 향후 서비스/DAO 계층을 통해 MySQL과 통신하도록 확장합니다.

3. **MySQL 연동**
   - 마이그레이션 도구(예: Prisma Migrate) 또는 기존 `infra/supabase` SQL 스크립트를 참고해 MySQL 스키마를 구성합니다.

4. **실시간/시그널링 기능 재구현**
   - 채팅/WebRTC 시그널링은 Supabase Realtime 대신 Express 서버에 붙은 WebSocket/Socket.IO로 대체합니다.
   - 인증된 소켓 연결을 위해 JWT 또는 세션을 공유하도록 설계합니다.

## 패키지 업데이트 공유 방법

- `package.json` / `package-lock.json`이 변경되면 팀원들도 로컬에서 다시 `npm install`을 실행해야 합니다.
- 루트에서 `npm install`을 실행하면 `front` / `back` 모두 자동 설치됩니다. 별도로 백엔드만 설치하고 싶다면 `cd back && npm install`을 사용하세요.
- 새로 추가된 모듈(`pino-http` 등)을 설치하지 않으면 TypeScript가 모듈/타입을 찾지 못해 에러가 발생합니다. PR 설명이나 커밋 메시지에 “npm install 필요”를 함께 적어 두면 좋습니다.

1. 클론
git clone <레포지토리_URL>
cd 25-team-team-caffeine


<레포지토리_URL> → 교수님 레포 주소 또는 GitHub 팀 레포 주소로 교체하세요.

2. 의존성 설치

루트 폴더에서 한 번만 실행하면
front / back / shared 모두 자동 설치됩니다 

npm install


설치 완료 후, node_modules 폴더는 front/back 내부에 자동 생성됩니다.

3. 환경 변수 설정

로컬 개발용 .env 파일을 각각 설정하세요...

Front (front/.env.local):

VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_API_BASE_URL=http://localhost:4000


Back (back/.env):

PORT=4000
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>


SERVICE_ROLE_KEY는 절대 프론트에 넣지 않습니다.
(서버 전용 키)


개별 실행 (선택사항)
## 프론트만 실행
npm run dev:front

## 백엔드만 실행
npm run dev:back

5. Supabase (선택사항)

로컬에서 DB 마이그레이션을 적용하거나
Supabase CLI를 사용하는 경우 아래 명령을 참고하세요 

cd infra/supabase
supabase start
supabase db push


## Commit 규칙 (예시)

"[김준호]커밋내용~~"
앞에 이름을 꼭 적어주세요!





작성자

김준호 (Junho Kim)

Team Caffeine

버전

Node.js v20.x 이상 권장

npm v10.x 이상

Supabase CLI v1.200+