# 포켓몬 경매 - 카카오 로그인 구현

## 프로젝트 구조

### 프론트엔드 (모바일 - React Native/Expo)

```
apps/mobile/
├── app/
│   ├── _layout.tsx          # 루트 레이아웃 (AuthProvider 적용)
│   ├── login.tsx            # 카카오 로그인 페이지
│   └── (tabs)/
│       ├── _layout.tsx      # 탭 레이아웃
│       └── index.tsx        # 홈 화면 (로그인 후)
├── context/
│   └── AuthContext.tsx      # 인증 전역 상태 관리
├── services/
│   └── authService.ts       # 카카오 로그인 API 통신
├── .env                     # 환경변수 (카카오 앱 ID 등)
└── package.json
```

### 백엔드 (Spring Boot)

```
backend/auction-api/
└── src/main/java/com/pokeauction/auction/api/
    ├── auth/
    │   ├── controller/
    │   │   └── AuthController.java      # POST /api/auth/kakao
    │   ├── service/
    │   │   ├── AuthService.java         # 카카오 로그인 비즈니스 로직
    │   │   └── JwtProvider.java         # JWT 토큰 발급
    │   ├── client/
    │   │   └── KakaoClient.java         # 카카오 API 호출
    │   └── dto/
    │       ├── KakaoLoginRequest.java
    │       ├── LoginResponse.java
    │       └── ...
    ├── global/config/
    │   ├── SecurityConfig.java          # 보안 설정
    │   └── RestTemplateConfig.java      # CORS 설정
    └── application.yml                  # 카카오 설정값
```

## 카카오 로그인 흐름

```
1. 사용자가 로그인 페이지에서 "카카오로 시작하기" 클릭
   ↓
2. WebBrowser.openAuthSessionAsync() - 카카오 로그인 페이지 오픈
   https://kauth.kakao.com/oauth/authorize?
   client_id={KAKAO_APP_ID}&
   redirect_uri={KAKAO_REDIRECT_URI}&
   response_type=code
   ↓
3. 사용자가 카카오 계정으로 로그인 → 인가 코드 발급
   ↓
4. 리다이렉트 URI로 이동하면서 인가 코드 전달
   http://localhost:8081/kakao/callback?code={code}
   ↓
5. 프론트엔드가 code 파라미터 추출
   ↓
6. authService.kakaoLogin(code) 호출
   POST /api/auth/kakao
   Body: { code, redirectUri }
   ↓
7. 백엔드:
   - 인가 코드로 카카오에 accessToken 요청
   - accessToken으로 사용자 정보 조회
   - DB에서 사용자 조회 또는 신규 가입
   - JWT 토큰 발급 (accessToken, refreshToken)
   ↓
8. 프론트엔드:
   - 응답받은 JWT 토큰 저장 (Secure Storage)
   - 로그인 완료 → 홈 화면으로 이동
```

## 설치 및 실행

### 1. 환경변수 설정

프론트엔드 (`.env` 파일):

```bash
# apps/mobile/.env
EXPO_PUBLIC_KAKAO_APP_ID=ca49621c2cede0534e5084a3487a5734
EXPO_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:8081/kakao/callback
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080
```

백엔드 (`application.yml`):

```yaml
kakao:
  client-id: ${KAKAO_REST_API_KEY}
  client-secret: ${KAKAO_CLIENT_SECRET}
  token-url: https://kauth.kakao.com/oauth/token
  user-info-url: https://kapi.kakao.com/v2/user/me

jwt:
  secret-key: ${JWT_SECRET_KEY}
  access-token-expiration: 3600 # 1시간
  refresh-token-expiration: 604800 # 7일
```

### 2. 필요한 패키지 설치

프론트엔드:

```bash
cd apps/mobile
npm install
# 또는
yarn install
```

설치되는 주요 패키지:

- `axios` - HTTP 클라이언트
- `expo-secure-store` - 안전한 토큰 저장소
- `expo-web-browser` - 웹 브라우저 통합

### 3. 백엔드 실행

```bash
cd backend/auction-api

# PostgreSQL 데이터베이스 시작 (docker-compose)
docker-compose -f ../../infra/docker-compose.yml up -d

# 백엔드 서버 시작 (포트 8080)
./gradlew bootRun
```

### 4. 프론트엔드 실행

```bash
cd apps/mobile

# Android 에뮬레이터에서 실행
npm run android

# iOS 시뮬레이터에서 실행 (macOS만)
npm run ios

# 웹 브라우저에서 실행
npm run web
```

## API 엔드포인트

### 카카오 로그인

```http
POST /api/auth/kakao
Content-Type: application/json

{
  "code": "카카오에서 받은 인가 코드",
  "redirectUri": "http://localhost:8081/kakao/callback"
}
```

**응답 (200 OK):**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "userId": 1,
  "nickname": "안녕안녕0123",
  "isNewUser": true
}
```

## 토큰 관리

### 프론트엔드 (Secure Storage)

```typescript
// 토큰 저장
await authService.saveTokens(accessToken, refreshToken);

// 토큰 가져오기
const token = await authService.getAccessToken();

// 로그아웃 (토큰 삭제)
await authService.clearTokens();
```

### API 요청 자동 인증

모든 API 요청에 `Authorization: Bearer {accessToken}` 자동 추가됨

## 보안 고려사항

1. **토큰 저장**: `expo-secure-store` 사용 (안전한 저장소)
2. **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용
3. **리프레시 토큰**: 만료된 accessToken일 경우 refreshToken으로 재발급 가능
4. **CORS**: 백엔드에서 허용된 오리진만 요청 가능

## 문제 해결

### 카카오 로그인이 작동하지 않는 경우

1. **카카오 앱 ID 확인**
   - `.env` 파일의 `EXPO_PUBLIC_KAKAO_APP_ID` 값 확인
   - [카카오 개발자 센터](https://developers.kakao.com/)에서 앱 ID 확인

2. **리다이렉트 URI 설정**
   - 카카오 개발자 센터 → 앱 설정 → 플랫폼 → Android/iOS
   - `http://localhost:8081/kakao/callback` 등록 확인

3. **백엔드 연결 확인**
   - `EXPO_PUBLIC_BACKEND_URL` 확인
   - 백엔드가 포트 8080에서 실행 중인지 확인
   - 콘솔에서 에러 메시지 확인

4. **네트워크 문제**
   - 방화벽 설정 확인
   - localhost 대신 컴퓨터 IP 주소 사용 필요할 수 있음

## 다음 단계

1. [ ] 회원가입 화면 개선 (닉네임 설정)
2. [ ] 리프레시 토큰 자동 갱신
3. [ ] API 에러 핸들링 개선
4. [ ] 로딩 스피너 UI 개선
5. [ ] 경매 목록 조회 API 구현
6. [ ] 입찰 기능 구현
