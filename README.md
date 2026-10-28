# GB 역량사전 (Cloudflare Workers · GitHub 자동배포)

```
cloudflare/
├─ public/index.html   역량사전 화면 (수정은 이 파일만 하면 됩니다)
├─ src/index.js        /api/chat — "역량 AI에게 물어보기" 서버 코드 (API 키 보관)
├─ wrangler.jsonc      Cloudflare 설정 (요청 속도 제한, 로그)
├─ package.json
└─ .gitignore
```

GitHub 저장소에 올려 두면, 이후에는 **GitHub에 수정본을 올릴 때마다 Cloudflare가 1~2분 안에 자동으로 다시 배포**합니다.

## 1. GitHub 저장소 만들기 (처음 한 번)

1. github.com → New repository → 이름 `gb-competency2` → **Private** → Create
2. "uploading an existing file" 클릭 → 이 폴더의 아래 항목을 끌어다 놓기
   `public` 폴더, `src` 폴더, `wrangler.jsonc`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`
   (`node_modules`, `.wrangler` 폴더는 올리지 않습니다)
3. Commit changes

## 2. Cloudflare에 연결 (처음 한 번)

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository**
2. GitHub 계정 연결 → `gb-competency2` 저장소 선택
3. 설정 화면
   - Project name: `gb-competency2` (wrangler.jsonc 의 name 과 같아야 함)
   - Build command: 비워 둠
   - Deploy command: `npx wrangler deploy` (기본값)
   - Root directory: `/`
4. **Create and deploy** → 1~2분 뒤 `https://gb-competency2.<계정이름>.workers.dev` 주소 생성

## 3. API 키 등록 (처음 한 번, 필수)

1. Workers & Pages → `gb-competency2` → **Settings** → **Variables and Secrets** → **Add**
2. Type: **Secret** / Name: `ANTHROPIC_API_KEY` / Value: `sk-ant-...`
3. Deploy (저장하면 바로 적용됩니다)
4. 사이트에서 "역량 AI에게 물어보기"로 질문이 되는지 확인

## 4. 이후 수정·배포

1. `public/index.html` 수정
2. GitHub 저장소 → `public/index.html` → 연필(Edit) 또는 Add file → Upload files 로 덮어쓰기 → Commit
3. 끝. Cloudflare → `gb-competency2` → **Deployments** 에서 진행 상황 확인

Git을 쓰는 경우:
```powershell
git add . ; git commit -m "역량사전 수정" ; git push
```

## 내 PC에서 미리 보기

```powershell
npm install
npx wrangler dev
```
`http://localhost:8787` 에서 열립니다. AI 질문까지 시험하려면 이 폴더에 `.dev.vars` 파일을 만들고
`ANTHROPIC_API_KEY=sk-ant-...` 한 줄을 적습니다 (GitHub에는 올라가지 않음).

## 꼭 지킬 것

- API 키를 코드, `wrangler.jsonc`, `public/` 안에 적지 마세요. Cloudflare 비밀값으로만 등록합니다.
- 주소를 아는 누구나 AI 기능을 쓸 수 있고 사용료는 회사 키로 나갑니다. 직원만 쓰게 하려면
  Cloudflare 대시보드 → Zero Trust → Access → Applications 에 이 주소를 등록하고 회사 이메일 도메인만 허용하세요 (50명까지 무료).
- Anthropic Console 에서 월 사용 한도를 설정해 두세요.
- Cloudflare 배포가 정상인 것을 확인한 뒤 기존 Netlify 사이트를 내리세요.

## 설정값

| 항목 | 위치 | 기본값 |
|---|---|---|
| 모델 | `src/index.js` `MODEL` | `claude-sonnet-5-5` |
| 답변 길이 | `src/index.js` `MAX_TOKENS` | 1500 |
| 요청 속도 제한 | `wrangler.jsonc` `ratelimits` | IP당 1분 10회 |
| 글꼴 | `public/index.html` `--sans` | Pretendard (jsDelivr CDN) |
