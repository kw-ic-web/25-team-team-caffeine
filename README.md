[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/T3W3QeQp)


Team Caffeine — 프로젝트 세팅 가이드

이 저장소는 Monorepo 구조(front + back + infra) 로 구성된 프로젝트입니다.
팀원은 아래 단계를 순서대로 실행하면 바로 개발 환경을 구성할 수 있습니다 

프로젝트 구조
25-team-team-caffeine/
├─ front/         # React + Vite 프론트엔드
├─ back/          # Node + Express 백엔드
└─ infra/
   └─ supabase/   # DB, 마이그레이션 관리

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

4. 개발 서버 실행

루트에서 아래 명령어 한 줄이면
프론트와 백엔드가 동시에 실행됩니다 👇

npm run dev


프론트엔드: http://localhost:5173

백엔드(API): http://localhost:4000/api/health

개별 실행 (선택사항)
# 프론트만 실행
npm run dev:front

# 백엔드만 실행
npm run dev:back

5. Supabase (선택사항)

로컬에서 DB 마이그레이션을 적용하거나
Supabase CLI를 사용하는 경우 아래 명령을 참고하세요 

cd infra/supabase
supabase start
supabase db push

Trouble Shooting
문제	해결 방법
vite 실행 안 됨	cd front && npm install 후 재시도
express 관련 타입 에러	cd back && npm i -D @types/node @types/express
.env 파일 인식 안 됨	파일명 확인 (.env.local, .env)
Git 한글 깨짐	git config --global i18n.commitencoding utf-8 설정

Commit 규칙 (예시)
"[김준호]커밋내용~~"
앞에 이름을 꼭 적어주세요!





작성자

김준호 (Junho Kim)

Team Caffeine

프로젝트 구조 설계 및 초기 환경 세팅 담당

버전

Node.js v20.x 이상 권장

npm v10.x 이상

Supabase CLI v1.200+