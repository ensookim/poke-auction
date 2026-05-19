# 포켓몬 경매 앱 - 전체 아키텍처 가이드

**목차**

1. [전체 시스템 개요](#전체-시스템-개요)
2. [백엔드 구조 (Spring Boot)](#백엔드-구조-spring-boot)
3. [프론트엔드 구조 (React Native)](#프론트엔드-구조-react-native)
4. [인증 흐름 (카카오 로그인)](#인증-흐름-카카오-로그인)
5. [데이터 흐름](#데이터-흐름)
6. [각 계층의 역할](#각-계층의-역할)
7. [왜 이런 구조를 선택했나](#왜-이런-구조를-선택했나)

---

# 전체 시스템 개요

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    포켓몬 경매 시스템                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│   모바일 앱 (Expo)     │              │   카카오 서버         │
│ React Native          │              │                      │
│ (Android/iOS)         │◄────────────►│ kauth.kakao.com      │
└──────────────────────┘              │ kapi.kakao.com       │
         ▲                             └──────────────────────┘
         │ HTTP(S)
         │ JSON
         │
         ▼
┌──────────────────────────────────────────────┐
│          백엔드 서버 (Spring Boot)             │
│          localhost:8080                      │
│  ┌────────────────────────────────────────┐  │
│  │ REST API 엔드포인트                      │  │
│  │ - POST /api/auth/kakao                 │  │
│  │ - GET  /api/auction/list               │  │
│  │ - POST /api/bid/create                 │  │
│  │ - ...                                  │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ 비즈니스 로직                            │  │
│  │ - 사용자 인증/관리                       │  │
│  │ - JWT 토큰 발급                         │  │
│  │ - 카카오 연동                           │  │
│  │ - 경매 로직                             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         ▲
         │ JDBC
         │ SQL
         │
         ▼
┌──────────────────────────────────────────────┐
│     데이터베이스 (PostgreSQL)                  │
│     localhost:5432                           │
│ ┌────────────────────────────────────────┐  │
│ │ 테이블                                   │  │
│ │ - users (사용자)                         │  │
│ │ - auctions (경매)                        │  │
│ │ - bids (입찰)                            │  │
│ │ - cards (포켓몬 카드)                     │  │
│ │ - ...                                  │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

# 백엔드 구조 (Spring Boot)

## 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────────┐
│       🎮 Presentation Layer (컨트롤러)        │
│ ┌───────────────────────────────────────┐  │
│ │ AuthController                        │  │
│ │ - @PostMapping("/api/auth/kakao")    │  │
│ │   : 카카오 로그인 요청 받기               │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              ↓ 의존성 주입
┌─────────────────────────────────────────────┐
│        🔧 Business Logic Layer (서비스)      │
│ ┌───────────────────────────────────────┐  │
│ │ AuthService                           │  │
│ │ - kakaoLogin(code, redirectUri)      │  │
│ │   : 카카오 로그인 비즈니스 로직         │  │
│ │   : 사용자 조회/생성                   │  │
│ │   : JWT 토큰 발급                     │  │
│ │                                       │  │
│ │ JwtProvider                           │  │
│ │ - createAccessToken(userId)          │  │
│ │ - createRefreshToken(userId)         │  │
│ │   : JWT 토큰 생성                      │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              ↓ 의존성 주입
┌─────────────────────────────────────────────┐
│      🌐 Integration Layer (외부 API)        │
│ ┌───────────────────────────────────────┐  │
│ │ KakaoClient                           │  │
│ │ - getToken(code, redirectUri)        │  │
│ │   : 카카오에 액세스 토큰 요청            │  │
│ │ - getUserInfo(accessToken)           │  │
│ │   : 카카오에 사용자 정보 요청            │  │
│ │                                       │  │
│ │ RestTemplate                          │  │
│ │ - HTTP 통신 담당                      │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              ↓ 의존성 주입
┌─────────────────────────────────────────────┐
│       📊 Data Access Layer (저장소)          │
│ ┌───────────────────────────────────────┐  │
│ │ UserRepository                        │  │
│ │ - findByProviderAndProviderId()      │  │
│ │   : 카카오 사용자로 DB에서 조회        │  │
│ │ - save(user)                         │  │
│ │   : 신규 사용자 저장                    │  │
│ │                                       │  │
│ │ JpaRepository (Spring Data JPA)      │  │
│ │ - 자동 SQL 쿼리 생성                   │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
              ↓ JDBC 드라이버
┌─────────────────────────────────────────────┐
│        🗄️ Database Layer (PostgreSQL)       │
│ ┌───────────────────────────────────────┐  │
│ │ users 테이블                           │  │
│ │ ┌───────────────────────────────────┐ │  │
│ │ │ id              | BIGINT (PK)     │ │  │
│ │ │ provider        | VARCHAR (ex)    │ │  │
│ │ │ provider_id     | VARCHAR         │ │  │
│ │ │ nickname        | VARCHAR         │ │  │
│ │ │ role            | VARCHAR         │ │  │
│ │ │ created_at      | TIMESTAMP       │ │  │
│ │ │ updated_at      | TIMESTAMP       │ │  │
│ │ └───────────────────────────────────┘ │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 백엔드 핵심 파일 설명

### 1. AuthController.java

**역할**: HTTP 요청 처리

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/kakao")
    public ResponseEntity<LoginResponse> kakaoLogin(
        @RequestBody KakaoLoginRequest request
    ) {
        // 1. 요청 받기
        // 2. 서비스 호출
        // 3. 응답 반환
    }
}
```

**왜 필요한가?**

- 클라이언트의 HTTP 요청을 받는 진입점
- 요청 유효성 검사 (Request Validation)
- 응답 형식 결정 (HTTP Status, JSON)

### 2. AuthService.java

**역할**: 비즈니스 로직 처리

```java
@Service
public class AuthService {
    public LoginResponse kakaoLogin(KakaoLoginRequest request) {
        // Step 1: 카카오 토큰 가져오기
        KakaoTokenResponse tokenResponse =
            kakaoClient.getToken(request.getCode(), request.getRedirectUri());

        // Step 2: 카카오 사용자 정보 조회
        KakaoUserResponse kakaoUser =
            kakaoClient.getUserInfo(tokenResponse.getAccessToken());

        // Step 3: DB에서 사용자 조회 또는 신규 생성
        User user = userRepository
            .findByProviderAndProviderId("KAKAO", kakaoUser.getId())
            .orElse(createNewUser(kakaoUser));

        // Step 4: JWT 토큰 발급
        String accessToken = jwtProvider.createAccessToken(user.getId());
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        // Step 5: 응답 객체 생성
        return LoginResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .userId(user.getId())
            .nickname(user.getNickname())
            .isNewUser(isNewUser)
            .build();
    }
}
```

**왜 필요한가?**

- 실제 비즈니스 로직 구현
- 여러 외부 서비스 조율 (카카오, DB, JWT)
- 트랜잭션 관리 (@Transactional)
- 에러 처리

### 3. KakaoClient.java

**역할**: 카카오 API 호출

```java
@Component
public class KakaoClient {
    public KakaoTokenResponse getToken(String code, String redirectUri) {
        // 카카오 토큰 서버에 HTTP 요청
        // code + client_id + redirect_uri → 액세스 토큰 받기
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", clientId);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);
        body.add("client_secret", clientSecret);

        return restTemplate.exchange(
            tokenUrl,
            HttpMethod.POST,
            request,
            KakaoTokenResponse.class
        ).getBody();
    }

    public KakaoUserResponse getUserInfo(String accessToken) {
        // 액세스 토큰으로 사용자 정보 조회
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        return restTemplate.exchange(
            userInfoUrl,
            HttpMethod.GET,
            request,
            KakaoUserResponse.class
        ).getBody();
    }
}
```

**왜 필요한가?**

- 외부 API (카카오)와의 통신 분리
- HTTP 요청/응답 처리
- 재사용 가능한 클라이언트

### 4. JwtProvider.java

**역할**: JWT 토큰 생성/검증

```java
@Component
public class JwtProvider {
    private String secretKey;  // 서명 키
    private long accessTokenExpiration = 3600;    // 1시간
    private long refreshTokenExpiration = 604800; // 7일

    public String createAccessToken(Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpiration * 1000);

        return Jwts.builder()
            .subject(String.valueOf(userId))
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
            .compact();

        // 결과: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjI...
    }
}
```

**왜 필요한가?**

- 서명된 토큰 생성 (위조 방지)
- 토큰 만료시간 설정
- 향후 토큰 검증에 사용

### 5. SecurityConfig.java

**역할**: 보안 설정

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
        throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)      // CSRF 비활성화
            .formLogin(AbstractHttpConfigurer::disable)  // 폼 로그인 비활성화
            .httpBasic(AbstractHttpConfigurer::disable)  // HTTP 기본 인증 비활성화
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )  // 세션 사용 안함 (JWT 사용)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // 인증 필요 없음
                .anyRequest().permitAll()  // 나머지 모두 허용 (임시)
            );
        return http.build();
    }
}
```

**왜 필요한가?**

- CORS, CSRF 공격 방지
- 엔드포인트별 권한 관리
- JWT 기반 인증으로 세션 제거

### 6. RestTemplateConfig.java (CORS 설정)

**역할**: 프론트엔드에서 백엔드 호출 허용

```java
@Bean
public CorsFilter corsFilter() {
    CorsConfiguration corsConfiguration = new CorsConfiguration();
    corsConfiguration.addAllowedOrigin("*");        // 모든 출처 허용
    corsConfiguration.addAllowedHeader("*");        // 모든 헤더 허용
    corsConfiguration.addAllowedMethod("*");        // 모든 HTTP 메서드 허용
    corsConfiguration.setAllowCredentials(false);   // 쿠키 전송 안함
    corsConfiguration.setMaxAge(3600L);             // 1시간 캐시

    UrlBasedCorsConfigurationSource source =
        new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", corsConfiguration);

    return new CorsFilter(source);
}
```

**왜 필요한가?**

- 다른 도메인의 요청 허용 (Cross-Origin)
- 예: localhost:19000 (프론트) → localhost:8080 (백)

---

# 프론트엔드 구조 (React Native)

## 컴포넌트 계층 구조

```
┌─────────────────────────────────────────────────┐
│          _layout.tsx (루트 레이아웃)              │
│        • AuthProvider 래핑                      │
│        • 경로 선택 (라우팅)                       │
└─────────────────────────────────────────────────┘
    ↑                                    ↑
    │ isSignedIn = false                 │ isSignedIn = true
    │                                    │
    ▼                                    ▼
┌──────────────────────┐         ┌──────────────────────┐
│    login.tsx         │         │  (tabs)/_layout.tsx  │
│ (로그인 페이지)      │         │  (탭 네비게이션)     │
│                      │         │                      │
│ • 카카오 로그인 UI    │         │ • Home 탭            │
│ • 브라우저 팝업      │         │ • Explore 탭         │
│ • code 추출          │         │ • 하단 탭 메뉴       │
│ • 백엔드 호출        │         └──────────────────────┘
│                      │                 ↓
└──────────────────────┘         ┌──────────────────────┐
                                  │  index.tsx           │
                                  │  (홈 화면)           │
                                  │                      │
                                  │ • 사용자 정보 표시    │
                                  │ • 로그아웃 버튼      │
                                  │ • 경매 목록          │
                                  └──────────────────────┘

┌─────────────────────────────────────────────────┐
│         AuthContext (전역 상태 관리)              │
│ • isLoading: boolean                            │
│ • isSignedIn: boolean                           │
│ • user: { id, nickname }                        │
│ • login(code): Promise                          │
│ • logout(): Promise                             │
│ • checkAuth(): Promise                          │
└─────────────────────────────────────────────────┘
         ↑
    모든 화면에서
    const { isSignedIn, user, login, logout } = useAuth()

┌─────────────────────────────────────────────────┐
│         authService (백엔드 통신)                 │
│ • kakaoLogin(code): Promise<LoginResponse>     │
│ • getKakaoLoginUrl(): string                   │
│ • getAccessToken(): Promise<string>            │
│ • saveTokens(access, refresh): Promise         │
│ • clearTokens(): Promise                       │
│ • axios 인터셉터 (자동 Authorization)           │
└─────────────────────────────────────────────────┘
         ↓ HTTP
┌─────────────────────────────────────────────────┐
│      SecureStore (안전한 토큰 저장소)             │
│ • accessToken                                   │
│ • refreshToken                                  │
└─────────────────────────────────────────────────┘
         ↓ 기기 암호화
┌─────────────────────────────────────────────────┐
│     모바일 기기 (Android/iOS)                     │
│     • 암호화된 저장소                             │
│     • 탈취 불가능                                │
└─────────────────────────────────────────────────┘
```

## 프론트엔드 핵심 파일 설명

### 1. AuthContext.tsx

**역할**: 전역 인증 상태 관리

```typescript
interface AuthContextType {
  isLoading: boolean;        // 로딩 상태
  isSignedIn: boolean;       // 로그인 여부
  user: {                    // 사용자 정보
    id: number;
    nickname: string;
  } | null;
  login: (code: string) => Promise<void>;    // 로그인 함수
  logout: () => Promise<void>;               // 로그아웃 함수
  checkAuth: () => Promise<void>;            // 인증 확인 함수
}

export function AuthProvider({ children }) {
  // 앱 시작 시 토큰 확인
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // SecureStore에서 accessToken 조회
    // 있으면 → isSignedIn = true
    // 없으면 → isSignedIn = false
  };

  const login = async (code: string) => {
    // 1. authService.kakaoLogin(code) 호출
    // 2. 응답에서 토큰 추출
    // 3. SecureStore에 저장
    // 4. 사용자 정보 저장
    // 5. isSignedIn = true로 변경
  };

  const logout = async () => {
    // 1. SecureStore에서 토큰 삭제
    // 2. 사용자 정보 삭제
    // 3. isSignedIn = false로 변경
  };

  return (
    <AuthContext.Provider value={{ isLoading, isSignedIn, user, ... }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  // 어디서나 const { isSignedIn, user, login, logout } = useAuth()
  // 로 사용 가능
}
```

**왜 필요한가?**

- **전역 상태**: 모든 화면에서 로그인 정보 접근
- **상태 동기화**: 한 곳에서 관리 → 다른 화면에 자동 반영
- **코드 재사용**: 로그인/로그아웃 로직 한 번만 작성

### 2. authService.ts

**역할**: 백엔드 API 통신

```typescript
class AuthService {
  private client: AxiosInstance;

  constructor() {
    // 1. axios 인스턴스 생성
    this.client = axios.create({
      baseURL: 'http://localhost:8080',
      timeout: 10000,
    });

    // 2. 요청 인터셉터 (모든 요청에 토큰 추가)
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async kakaoLogin(code: string): Promise<LoginResponse> {
    // POST /api/auth/kakao
    const response = await this.client.post('/api/auth/kakao', {
      code,
      redirectUri: 'http://localhost:8081/kakao/callback',
    });
    return response.data;
    // 반환: { accessToken, refreshToken, userId, nickname, isNewUser }
  }

  getKakaoLoginUrl(): string {
    // 카카오 로그인 페이지 URL 생성
    // https://kauth.kakao.com/oauth/authorize?client_id=...&...
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    // SecureStore에 토큰 저장 (암호화)
    await Promise.all([
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('refreshToken', refreshToken),
    ]);
  }

  async clearTokens() {
    // SecureStore에서 토큰 삭제 (로그아웃)
  }
}
```

**왜 필요한가?**

- **API 통신 분리**: UI와 API 로직 분리 → 테스트 용이
- **인터셉터**: 모든 요청에 자동으로 토큰 추가
- **재사용성**: 여러 컴포넌트에서 사용 가능

### 3. login.tsx

**역할**: 카카오 로그인 UI

```typescript
export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleKakaoLogin = async () => {
    // 1. authService.getKakaoLoginUrl() 호출
    const kakaoLoginUrl = authService.getKakaoLoginUrl();

    // 2. WebBrowser.openAuthSessionAsync() - 브라우저 팝업 열기
    const result = await WebBrowser.openAuthSessionAsync(
      kakaoLoginUrl,
      'http://localhost:8081/kakao/callback'
    );

    // 3. 사용자가 로그인하면 result에 인가 코드 포함됨
    if (result.type === 'success') {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');

      // 4. AuthContext의 login 함수 호출
      await login(code);

      // 5. 로그인 성공 → _layout.tsx에서 자동으로 홈 화면으로 이동
    }
  };

  return (
    <ThemedView>
      <ThemedText>포켓몬 경매</ThemedText>
      <Pressable onPress={handleKakaoLogin}>
        <ThemedText>카카오로 시작하기</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
```

**왜 필요한가?**

- 사용자 입력 받기
- 카카오 로그인 브라우저 팝업 관리
- 백엔드와의 토큰 교환

### 4. \_layout.tsx (라우팅)

**역할**: 로그인 상태에 따라 화면 결정

```typescript
function RootLayoutNav() {
  const { isSignedIn, isLoading } = useAuth();

  return (
    <Stack>
      {isSignedIn ? (
        // 로그인됨 → 탭 메뉴 화면
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" />
        </>
      ) : (
        // 로그인 안 됨 → 로그인 화면
        <Stack.Screen name="login" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

**왜 필요한가?**

- **조건부 렌더링**: 로그인 여부에 따라 다른 화면 표시
- **보안**: 로그인 안 한 사용자가 홈 화면 접근 불가
- **UX**: 자동으로 올바른 화면으로 이동

### 5. (tabs)/index.tsx (홈 화면)

**역할**: 로그인 후 메인 화면

```typescript
export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView>
      <ThemedText>{user?.nickname}님 환영합니다!</ThemedText>
      <Pressable onPress={logout}>
        <ThemedText>로그아웃</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
```

**왜 필요한가?**

- useAuth()로 로그인 정보 접근
- 사용자 맞춤 콘텐츠 표시
- 로그아웃 기능

### 6. SecureStore

**역할**: 안전한 토큰 저장

```typescript
// 저장
await SecureStore.setItemAsync('accessToken', token);

// 조회
const token = await SecureStore.getItemAsync('accessToken');

// 삭제
await SecureStore.deleteItemAsync('accessToken');
```

**왜 필요한가?**

- **보안**: 암호화된 저장소 (기기 레벨)
- **탈취 방지**: localStorage는 탈취 위험
- **모바일 표준**: iOS Keychain, Android Keystore 사용

---

# 인증 흐름 (카카오 로그인)

## 전체 순서 (A-Z)

### Step 1: 앱 시작

```
앱 실행
  ↓
RootLayout 렌더링
  ↓
<AuthProvider> 시작
  ↓
checkAuth() 호출 (useEffect)
  ↓
SecureStore에서 accessToken 조회
  ↓
있음? → isSignedIn = true → (tabs) 화면으로
없음? → isSignedIn = false → login 화면으로
```

**코드:**

```typescript
// AuthContext.tsx
useEffect(() => {
  checkAuth(); // 앱 시작 시 자동 실행
}, []);

const checkAuth = async () => {
  const token = await authService.getAccessToken();
  setIsSignedIn(!!token);
};
```

### Step 2: 로그인 페이지 표시

```
login.tsx 렌더링
  ↓
사용자가 "카카오로 시작하기" 클릭
  ↓
handleKakaoLogin() 실행
```

### Step 3: 카카오 로그인 URL 생성

```
authService.getKakaoLoginUrl() 호출
  ↓
URLSearchParams 생성:
  client_id: "ca49621c2cede0534e5084a3487a5734"
  redirect_uri: "http://localhost:8081/kakao/callback"
  response_type: "code"
  ↓
URL 반환:
https://kauth.kakao.com/oauth/authorize?
client_id=ca49621c2cede0534e5084a3487a5734&
redirect_uri=http%3A%2F%2Flocalhost%3A8081%2Fkakao%2Fcallback&
response_type=code
```

**코드:**

```typescript
// authService.ts
getKakaoLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: KAKAO_APP_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: 'code',
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}
```

### Step 4: 브라우저 팝업으로 카카오 로그인 페이지 열기

```
WebBrowser.openAuthSessionAsync() 호출
  ↓
시스템 브라우저에 카카오 로그인 페이지 로드
  ↓
사용자가 카카오 계정 입력 + 승인
  ↓
카카오 서버가 인가 코드 발급
  ↓
리다이렉트 URI로 이동:
http://localhost:8081/kakao/callback?code=abc123def456
  ↓
WebBrowser가 이 URL 감지
  ↓
result 객체에 URL 반환
```

**코드:**

```typescript
// login.tsx
const result = await WebBrowser.openAuthSessionAsync(
  kakaoLoginUrl, // 카카오 로그인 페이지
  'http://localhost:8081/kakao/callback', // 돌아올 주소
);

if (result.type === 'success') {
  // result.url = 'http://localhost:8081/kakao/callback?code=abc123'
}
```

### Step 5: 인가 코드 추출

```
result.url 파싱
  ↓
URL.searchParams.get('code') 호출
  ↓
code = "abc123def456" 추출
```

**코드:**

```typescript
const url = new URL(result.url);
const code = url.searchParams.get('code');
// code = "abc123def456"
```

### Step 6: 백엔드로 code 전달

```
login(code) 호출 (AuthContext)
  ↓
authService.kakaoLogin(code) 호출
  ↓
axios POST /api/auth/kakao 요청
Body:
{
  "code": "abc123def456",
  "redirectUri": "http://localhost:8081/kakao/callback"
}
  ↓
백엔드 수신
```

**코드:**

```typescript
// AuthContext.tsx
const login = async (code: string) => {
  const response = await authService.kakaoLogin(code);
  // POST 요청 후 응답 받기
};

// authService.ts
async kakaoLogin(code: string): Promise<LoginResponse> {
  const response = await this.client.post('/api/auth/kakao', {
    code,
    redirectUri: KAKAO_REDIRECT_URI,
  });
  return response.data;
}
```

### Step 7: 백엔드에서 카카오 토큰 교환

```
AuthController.kakaoLogin() 수신
  ↓
AuthService.kakaoLogin() 호출
  ↓
KakaoClient.getToken(code) 호출
  ↓
카카오 토큰 서버에 요청:
POST https://kauth.kakao.com/oauth/token
Headers: Content-Type: application/x-www-form-urlencoded
Body:
  grant_type=authorization_code
  client_id=ca49621c...
  client_secret=xxxxx (백엔드만 알고 있음)
  code=abc123def456
  redirect_uri=http://localhost:8081/kakao/callback
  ↓
카카오 서버에서 응답:
{
  "access_token": "kakao_access_token_xyz789",
  "token_type": "Bearer",
  "expires_in": 21599,
  ...
}
  ↓
KakaoTokenResponse 객체로 변환
```

**백엔드 코드:**

```java
// KakaoClient.java
public KakaoTokenResponse getToken(String code, String redirectUri) {
    MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
    body.add("grant_type", "authorization_code");
    body.add("client_id", clientId);
    body.add("redirect_uri", redirectUri);
    body.add("code", code);
    body.add("client_secret", clientSecret);  // 백엔드만 알고 있음!

    ResponseEntity<KakaoTokenResponse> response = restTemplate.exchange(
        tokenUrl,
        HttpMethod.POST,
        request,
        KakaoTokenResponse.class
    );
    return response.getBody();
}
```

### Step 8: 카카오 사용자 정보 조회

```
KakaoClient.getUserInfo(accessToken) 호출
  ↓
카카오 API 서버에 요청:
GET https://kapi.kakao.com/v2/user/me
Headers: Authorization: Bearer kakao_access_token_xyz789
  ↓
카카오 서버에서 응답:
{
  "id": 1234567890,
  "kakao_account": {
    "email": "user@example.com",
    "profile": {
      "nickname": "포켓몬마스터",
      ...
    },
    ...
  }
}
  ↓
KakaoUserResponse 객체로 변환
```

**백엔드 코드:**

```java
// KakaoClient.java
public KakaoUserResponse getUserInfo(String accessToken) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(accessToken);

    ResponseEntity<KakaoUserResponse> response = restTemplate.exchange(
        userInfoUrl,
        HttpMethod.GET,
        request,
        KakaoUserResponse.class
    );
    return response.getBody();
}
```

### Step 9: 백엔드 DB에서 사용자 조회/생성

```
UserRepository.findByProviderAndProviderId("KAKAO", "1234567890")
  ↓
사용자 조회 쿼리:
SELECT * FROM users WHERE provider='KAKAO' AND provider_id='1234567890'
  ↓
결과:
- 있음? → 기존 사용자
- 없음? → 신규 사용자 생성

신규 사용자인 경우:
User newUser = User.builder()
    .provider("KAKAO")
    .providerId("1234567890")
    .nickname("안녕안녕7890")  // 자동 생성
    .role("USER")
    .build();

userRepository.save(newUser)  // DB에 저장
  ↓
INSERT INTO users (provider, provider_id, nickname, role, created_at)
VALUES ('KAKAO', '1234567890', '안녕안녕7890', 'USER', NOW())
```

**백엔드 코드:**

```java
// AuthService.java
User user = userRepository
    .findByProviderAndProviderId("KAKAO", providerId)
    .orElse(null);

if (user == null) {
    isNewUser = true;
    String nickname = "안녕안녕" + providerId.substring(providerId.length() - 4);
    user = userRepository.save(
        User.builder()
            .provider("KAKAO")
            .providerId(providerId)
            .nickname(nickname)
            .role("USER")
            .build()
    );
}
```

### Step 10: JWT 토큰 발급

```
JwtProvider.createAccessToken(userId) 호출
  ↓
JWT 토큰 생성:
Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "1",
  "iat": 1716978400,
  "exp": 1716982000  // 1시간 후
}
Signature: HMAC-SHA256(base64header + base64payload, secret-key)
  ↓
결과 (3개 부분을 . 로 연결):
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzE2OTc4NDAwLCJleHAiOjE3MTY5ODIwMDB9.xyz789...
  ↓
RefreshToken도 동일 방식으로 생성 (만료: 7일)
```

**백엔드 코드:**

```java
// JwtProvider.java
public String createAccessToken(Long userId) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + accessTokenExpiration * 1000);

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .issuedAt(now)
        .expiration(expiryDate)
        .signWith(Keys.hmacShaKeyFor(secretKey.getBytes()))
        .compact();
}
```

### Step 11: 응답 생성 및 반환

```
LoginResponse 객체 생성:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "userId": 1,
  "nickname": "안녕안녕7890",
  "isNewUser": true
}
  ↓
HTTP 200 OK로 프론트엔드에 반환
```

**백엔드 코드:**

```java
// AuthService.java
return LoginResponse.builder()
    .accessToken(accessToken)
    .refreshToken(refreshToken)
    .userId(user.getId())
    .nickname(user.getNickname())
    .isNewUser(isNewUser)
    .build();
```

### Step 12: 프론트엔드에서 토큰 저장

```
AuthContext.login() 응답 받기
  ↓
authService.saveTokens(accessToken, refreshToken) 호출
  ↓
SecureStore에 저장:
- accessToken → 암호화되어 기기에 저장
- refreshToken → 암호화되어 기기에 저장
  ↓
setUser() - 사용자 정보 메모리에 저장
  ↓
setIsSignedIn(true) - 로그인 상태 변경
  ↓
AuthContext.Provider의 value 업데이트 → 모든 자식 컴포넌트 리렌더링
```

**프론트엔드 코드:**

```typescript
// AuthContext.tsx
const login = async (code: string) => {
  const response = await authService.kakaoLogin(code);

  // 토큰 저장
  await authService.saveTokens(response.accessToken, response.refreshToken);

  // 사용자 정보 저장
  setUser({
    id: response.userId,
    nickname: response.nickname,
  });

  // 로그인 상태 변경
  setIsSignedIn(true);
};
```

### Step 13: 조건부 렌더링으로 홈 화면으로 이동

```
isSignedIn 상태 변경 감지
  ↓
_layout.tsx의 RootLayoutNav() 리렌더링
  ↓
isSignedIn = true 확인
  ↓
<Stack.Screen name="(tabs)" /> 렌더링
  ↓
(tabs)/index.tsx 표시 (홈 화면)
  ↓
사용자는 자동으로 홈 화면으로 이동
```

**프론트엔드 코드:**

```typescript
// _layout.tsx
function RootLayoutNav() {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      {isSignedIn ? (
        // 로그인됨 → 홈 화면
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </>
      ) : (
        // 로그인 안 됨 → 로그인 화면
        <Stack.Screen name="login" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

---

# 데이터 흐름

## 타임 시퀀스 다이어그램

```
시간 →

프론트엔드          카카오 서버            백엔드              DB
     │                  │                    │                  │
     │─── 로그인 페이지 표시 ───                                 │
     │                  │                    │                  │
     │─────────────────────────────────────────────────────────│
     │  "카카오로 시작하기" 클릭
     │                  │                    │                  │
     │  generateUrl()   │                    │                  │
     ├─ https://kauth.kakao.com/oauth/authorize?... ─┤
     │  openAuthSessionAsync()  │            │                  │
     │                  │                    │                  │
     │  ◄─────── 사용자 계정 입력 ──────────│                  │
     │                  │                    │                  │
     │◄─────── 승인 ────────────┤            │                  │
     │                  │                    │                  │
     │◄─────── 인가 코드 리다이렉트 ──┤      │                  │
     │  ?code=abc123    │                    │                  │
     │                  │                    │                  │
     │  code 추출       │                    │                  │
     ├─ login(code)     │                    │                  │
     │                  │                    │                  │
     │──── POST /api/auth/kakao ────────────► │                 │
     │  { code, redirectUri }                 │                 │
     │                  │                    │                 │
     │                  │  getToken(code)    │                 │
     │                  │◄──────────────────┤                 │
     │                  │  accessToken      │                 │
     │                  ├──────────────────►│                 │
     │                  │                    │                 │
     │                  │  getUserInfo()     │                 │
     │                  │◄──────────────────┤                 │
     │                  │  user data        │                 │
     │                  ├──────────────────►│                 │
     │                  │                    │  SELECT * FROM  │
     │                  │                    │  users WHERE... │
     │                  │                    ├────────────────►│
     │                  │                    │  (없음)         │
     │                  │                    │◄────────────────┤
     │                  │                    │                 │
     │                  │                    │  INSERT user    │
     │                  │                    ├────────────────►│
     │                  │                    │  (성공)         │
     │                  │                    │◄────────────────┤
     │                  │                    │                 │
     │                  │  createToken()     │                 │
     │                  │◄──────────────────┤                 │
     │                  │  accessToken,      │                 │
     │                  │  refreshToken      │                 │
     │                  ├──────────────────►│                 │
     │                  │                    │                 │
     │◄───── LoginResponse ────────────────┤                 │
     │  { accessToken,                       │                 │
     │    refreshToken,                      │                 │
     │    userId, nickname }                 │                 │
     │                  │                    │                 │
     │  saveTokens()    │                    │                 │
     │  (SecureStore)   │                    │                 │
     │                  │                    │                 │
     │  login 완료!     │                    │                 │
     │  (tabs)로 이동   │                    │                 │
     │                  │                    │                 │
```

## 각 요청의 헤더와 바디

### 1️⃣ 프론트엔드 → 백엔드: 로그인 요청

```http
POST /api/auth/kakao HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Content-Length: 100

{
  "code": "abc123def456",
  "redirectUri": "http://localhost:8081/kakao/callback"
}
```

### 2️⃣ 백엔드 → 카카오: 토큰 요청

```http
POST /oauth/token HTTP/1.1
Host: kauth.kakao.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=ca49621c2cede0534e5084a3487a5734&
client_secret=xxxxx&
code=abc123def456&
redirect_uri=http%3A%2F%2Flocalhost%3A8081%2Fkakao%2Fcallback
```

### 3️⃣ 백엔드 ← 카카오: 토큰 응답

```json
{
  "access_token": "kakao_access_token_xyz789",
  "token_type": "Bearer",
  "expires_in": 21599,
  "refresh_token": "kakao_refresh_token_abc123",
  "scope": "account_email profile"
}
```

### 4️⃣ 백엔드 → 카카오: 사용자 정보 요청

```http
GET /v2/user/me HTTP/1.1
Host: kapi.kakao.com
Authorization: Bearer kakao_access_token_xyz789
```

### 5️⃣ 백엔드 ← 카카오: 사용자 정보 응답

```json
{
  "id": 1234567890,
  "connected_at": "2024-05-13T10:00:00Z",
  "kakao_account": {
    "profile_needs_agreement": false,
    "profile": {
      "nickname": "포켓몬마스터",
      "is_default_image": false
    },
    "email_needs_agreement": false,
    "is_email_valid": true,
    "is_email_verified": true,
    "email": "user@example.com"
  }
}
```

### 6️⃣ 프론트엔드 ← 백엔드: 로그인 응답

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 250

{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzE2OTc4NDAwLCJleHAiOjE3MTY5ODIwMDB9.xyz789",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzE2OTc4NDAwLCJleHAiOjE3MTcwNjI4MDB9.abc123",
  "userId": 1,
  "nickname": "안녕안녕7890",
  "isNewUser": true
}
```

---

# 각 계층의 역할

## 백엔드 계층별 역할

### 1. Presentation Layer (AuthController)

**역할:** HTTP 요청/응답 처리

```
클라이언트 요청
     ↓
HTTP 메서드 확인 (POST, GET, ...)
     ↓
URL 경로 확인 (/api/auth/kakao)
     ↓
JSON 바디 파싱
     ↓
@RequestBody로 Java 객체로 변환
     ↓
서비스 호출
     ↓
응답 객체 생성
     ↓
HTTP 상태 코드 + JSON 반환
```

**책임:**

- ✅ 요청 유효성 검사
- ✅ 바디/파라미터 파싱
- ✅ 응답 형식 결정 (HTTP 상태, 헤더)
- ❌ 비즈니스 로직 처리 (서비스로 위임)

### 2. Business Logic Layer (AuthService)

**역할:** 비즈니스 로직 구현

```
Step 1: 입력 데이터 검증
       ↓ (유효하지 않으면 예외 발생)
Step 2: 외부 API 호출 (카카오)
       ↓ (토큰, 사용자 정보 받기)
Step 3: DB에서 사용자 조회
       ↓ (트랜잭션 시작)
Step 4: 사용자 없으면 신규 생성
       ↓
Step 5: JWT 토큰 생성
       ↓
Step 6: 응답 객체 반환
       ↓ (트랜잭션 커밋)
```

**책임:**

- ✅ 복잡한 비즈니스 로직
- ✅ 여러 API/DB 호출 조율
- ✅ 트랜잭션 관리
- ✅ 에러 처리/검증
- ❌ HTTP 처리 (컨트롤러로 위임)
- ❌ 데이터 접근 (저장소로 위임)

### 3. Integration Layer (KakaoClient)

**역할:** 외부 시스템 통신

```
카카오 API 호출
     ↓
REST 엔드포인트 결정
     ↓
HTTP 메서드, 헤더, 바디 구성
     ↓
RestTemplate으로 요청
     ↓
응답 파싱
     ↓
Java 객체로 변환
     ↓
서비스로 반환
```

**책임:**

- ✅ 외부 API 호출
- ✅ HTTP 통신 세부사항 처리
- ✅ 응답 파싱
- ❌ 비즈니스 로직 (서비스로 위임)

### 4. Data Access Layer (UserRepository)

**역할:** 데이터베이스 접근

```
JPA 메서드 호출
     ↓
SQL 자동 생성
     ↓
데이터베이스 쿼리 실행
     ↓
ResultSet → Java 객체 매핑
     ↓
객체 반환
```

**책임:**

- ✅ 데이터베이스 CRUD
- ✅ ORM (Object-Relational Mapping)
- ❌ 비즈니스 로직
- ❌ HTTP 처리

---

## 프론트엔드 계층별 역할

### 1. Presentation Layer (UI Components)

**역할:** 사용자 인터페이스 렌더링

```
화면 구성요소 표시
     ↓
사용자 입력 감지 (버튼 클릭 등)
     ↓
이벤트 핸들러 호출
     ↓
상태 업데이트 (setState)
     ↓
화면 리렌더링
```

**파일:** `login.tsx`, `index.tsx`

**책임:**

- ✅ UI 렌더링
- ✅ 사용자 입력 처리
- ✅ 상태 기반 조건부 렌더링
- ❌ API 통신 (서비스로 위임)
- ❌ 상태 관리 (Context로 위임)

### 2. State Management Layer (Context)

**역할:** 전역 상태 관리

```
상태 초기화 (useState)
     ↓
상태 변경 함수 정의
     ↓
useEffect로 초기화 작업
     ↓
Provider로 하위 컴포넌트에 제공
     ↓
하위 컴포넌트에서 useContext로 접근
```

**파일:** `AuthContext.tsx`

**책임:**

- ✅ 전역 상태 관리
- ✅ 상태 변경 로직
- ✅ 초기화 (앱 시작 시)
- ❌ API 통신 (서비스로 위임)
- ❌ 상세 비즈니스 로직

### 3. API Communication Layer (Service)

**역할:** 백엔드 API 통신

```
API 요청 준비
     ↓
URL, 메서드, 바디 결정
     ↓
axios로 요청 전송
     ↓
응답 파싱
     ↓
객체로 변환
     ↓
호출자에게 반환
```

**파일:** `authService.ts`

**책임:**

- ✅ HTTP 통신
- ✅ 요청 구성
- ✅ 응답 파싱
- ✅ 토큰 관리 (저장/조회)
- ✅ 인터셉터 (자동 인증)
- ❌ 상태 관리

### 4. Storage Layer (SecureStore)

**역할:** 데이터 저장소

```
암호화된 저장소 접근
     ↓
데이터 저장/조회/삭제
     ↓
기기 보안 저장소 사용
```

**책임:**

- ✅ 민감한 데이터 저장 (토큰)
- ✅ 암호화
- ❌ 임시 데이터 (Context)

---

# 왜 이런 구조를 선택했나

## 1. 계층 분리 (Layered Architecture)

### 문제: 계층을 나누지 않았다면?

```typescript
// ❌ 안 좋은 예: 모든 로직이 컴포넌트에
function LoginScreen() {
  const handleLogin = async () => {
    // HTTP 요청
    const response = await fetch('http://localhost:8080/api/auth/kakao', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    });

    // 응답 파싱
    const data = await response.json();

    // 토큰 저장
    localStorage.setItem('token', data.accessToken); // ❌ 위험!

    // 상태 업데이트
    setUser(data);

    // 라우팅
    navigate('/home');
  };

  // 문제점:
  // 1. 모든 로직이 섞여있음 → 이해하기 어려움
  // 2. 테스트 불가능
  // 3. 재사용 불가능
  // 4. 보안 위험 (localStorage)
}
```

### 해결: 계층 분리

```typescript
// ✅ 좋은 예: 각 계층이 책임을 분리

// 1. Presentation (UI)
function LoginScreen() {
  const { login } = useAuth();

  const handleLogin = async (code) => {
    await login(code); // 간단함!
  };
}

// 2. State Management
function AuthProvider() {
  const login = async (code) => {
    const response = await authService.kakaoLogin(code);
    await authService.saveTokens(response.accessToken);
    setIsSignedIn(true);
  };
}

// 3. API Communication
class AuthService {
  async kakaoLogin(code) {
    return this.client.post('/api/auth/kakao', { code });
  }
}

// 4. Storage
// SecureStore는 자동으로 암호화

// 장점:
// 1. 각 계층이 하나의 책임만 함
// 2. 테스트 가능
// 3. 재사용 가능
// 4. 보안 (SecureStore 사용)
```

## 2. Context API 사용 이유

### 문제: Props Drilling

```typescript
// ❌ Props로 계속 전달
function App() {
  const [user, setUser] = useState(null);
  return <RootLayout user={user} />;  // props 전달
}

function RootLayout({ user }) {
  return <Tabs user={user} />;  // 또 전달
}

function Tabs({ user }) {
  return <Home user={user} />;  // 또 전달
}

function Home({ user }) {
  return <Text>{user.nickname}</Text>;  // 드디어 사용
}

// 문제: 중간 컴포넌트들은 user를 사용하지 않는데도 props로 받고 전달함
```

### 해결: Context API

```typescript
// ✅ Context로 직접 접근
const AuthContext = createContext();

function App() {
  return (
    <AuthProvider>  {/* user 제공 */}
      <RootLayout />
    </AuthProvider>
  );
}

function Home() {
  const { user } = useAuth();  // 직접 접근!
  return <Text>{user.nickname}</Text>;
}

// 장점:
// 1. Props 전달 제거
// 2. 어디서나 접근 가능
// 3. 코드 간결
```

## 3. JWT 토큰 사용 이유

### 문제: 세션 기반 인증

```
클라이언트                    서버
  │                           │
  ├─ 로그인 ────────────────► │
  │                           │ (세션 저장소에 저장)
  │                           │ sessionId = "abc123"
  │ ◄─ sessionId ────────────┤
  │                           │
  ├─ 경매 목록 요청 ────────► │
  │ (sessionId 포함)          │ (저장소에서 조회)
  │ ◄─ 경매 목록 ───────────┤ (매번 조회해야 함)
  │                           │
  └─ 수많은 요청 ────────────►│ (매번 저장소 접근)

문제:
1. 매번 저장소 접근 → 느림
2. 저장소 용량 커짐 → 비용 증가
3. 분산 서버에서 관리 어려움
4. 모바일에서는 쿠키 사용 어려움
```

### 해결: JWT 토큰

```
클라이언트                    서버
  │                           │
  ├─ 로그인 ────────────────► │
  │                           │ (서버가 JWT 생성)
  │ ◄─ JWT 토큰 ────────────┤ (서명됨)
  │ (저장: SecureStore)       │
  │                           │
  ├─ 경매 목록 요청 ────────► │
  │ Authorization: Bearer JWT │ (토큰 검증)
  │ ◄─ 경매 목록 ───────────┤ (매번 검증)
  │                           │
  └─ 수많은 요청 ────────────►│ (저장소 접근 불필요)

장점:
1. 매번 저장소 접근 불필요 → 빠름
2. 저장소 필요 없음 → 비용 절감
3. 분산 서버에서 쉽게 관리 가능
4. 모바일 친화적 (HTTP Authorization)
5. 토큰 만료 시간 설정 가능
6. 토큰 서명으로 위조 불가능
```

**JWT 토큰의 구조:**

```
eyJhbGciOiJIUzI1NiJ9  .  eyJzdWIiOiIxIiwiaWF0IjoxNzE2...  .  xyz789...
└─ Header ────┘       └─ Payload ────────────────────┘     └─ Signature ┘
```

## 4. SecureStore 사용 이유

### 문제: localStorage 사용

```typescript
// ❌ 위험
localStorage.setItem('accessToken', token);

// 왜 위험한가?
// 1. 암호화되지 않음
// 2. XSS 공격으로 탈취 가능
// 3. 개발자 도구에서 쉽게 확인 가능
// 4. 모바일에서는 접근성이 떨어짐
```

### 해결: SecureStore

```typescript
// ✅ 안전
await SecureStore.setItemAsync('accessToken', token);

// 왜 안전한가?
// 1. 암호화됨 (기기 레벨)
// 2. OS 보안 저장소 사용
//    - iOS: Keychain
//    - Android: Keystore
// 3. 개발자 도구에서도 접근 불가
// 4. 기기가 탈취되어도 안전
```

## 5. Axios 인터셉터 사용 이유

### 문제: 매번 토큰 추가

```typescript
// ❌ 반복
const response1 = await fetch('/api/auction/list', {
  headers: { Authorization: `Bearer ${token}` },
});

const response2 = await fetch('/api/auction/detail/1', {
  headers: { Authorization: `Bearer ${token}` },
});

const response3 = await fetch('/api/bid/create', {
  headers: { Authorization: `Bearer ${token}` },
});

// 문제: 매번 토큰을 수동으로 추가해야 함
```

### 해결: Axios 인터셉터

```typescript
// ✅ 자동
this.client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 이제 이렇게 하면
const response1 = await this.client.get('/api/auction/list');
const response2 = await this.client.get('/api/auction/detail/1');
const response3 = await this.client.post('/api/bid/create');

// 자동으로 토큰이 추가됨!

// 장점:
// 1. 코드 중복 제거
// 2. 한 곳에서만 관리
// 3. 토큰 갱신 시 한 곳만 수정
```

## 6. 조건부 라우팅 사용 이유

### 문제: 항상 모든 화면 렌더링

```typescript
// ❌ 위험
function App() {
  return (
    <Stack>
      <Stack.Screen name="login" />      {/* 항상 렌더링 */}
      <Stack.Screen name="(tabs)" />     {/* 항상 렌더링 */}
      <Stack.Screen name="profile" />    {/* 항상 렌더링 */}
    </Stack>
  );
}

// 문제:
// 1. 로그인 안 한 사용자도 홈 화면 접근 가능
// 2. 메모리 낭비 (모든 화면 로드)
// 3. 보안 위험
```

### 해결: 조건부 라우팅

```typescript
// ✅ 안전
function RootLayoutNav() {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      {isSignedIn ? (
        <>
          <Stack.Screen name="(tabs)" />    {/* 로그인 시만 */}
          <Stack.Screen name="profile" />   {/* 로그인 시만 */}
        </>
      ) : (
        <Stack.Screen name="login" />       {/* 로그인 전만 */}
      )}
    </Stack>
  );
}

// 장점:
// 1. 로그인 안 한 사용자는 홈 화면 접근 불가
// 2. 필요한 화면만 렌더링 → 성능 향상
// 3. 자동 리다이렉트
```

---

# 추가 개념

## 카카오 로그인이 안전한 이유

### OAuth 2.0 Authorization Code Flow

```
1. 앱이 브라우저에서 카카오 로그인
   → 사용자 비밀번호를 앱에 입력 안 함 ✅

2. 카카오가 인가 코드 발급
   → 일회용 코드 (짧은 만료시간) ✅

3. 앱이 인가 코드를 백엔드로 전달
   → 암호화된 HTTPS 통신 ✅

4. 백엔드가 client_secret과 함께 토큰 요청
   → 앱은 client_secret을 모름 ✅
   → 백엔드만 알고 있음 ✅

5. 백엔드가 액세스 토큰 발급
   → 앱에 JWT 발급 ✅

결과:
- 사용자 비밀번호 노출 없음
- 앱이 client_secret을 몰라서 위험 없음
- 토큰이 만료되면 다시 로그인 필요
```

## 왜 accessToken과 refreshToken을 따로 관리하나?

### AccessToken (짧은 만료: 1시간)

```
장점:
1. 만료 시간이 짧음 → 탈취 위험 감소
2. 사용자가 로그아웃 하면 이미 만료됨

단점:
1. 자주 갱신 필요 → 백엔드 부하

용도:
- 모든 API 요청에 사용
- Authorization: Bearer {accessToken}
```

### RefreshToken (긴 만료: 7일)

```
장점:
1. 만료 시간이 김 → 자주 갱신할 필요 없음
2. AccessToken 만료 시 새로 발급 가능

단점:
1. 탈취 위험이 더 높음 (긴 만료)

용도:
- AccessToken 만료 시 새로운 AccessToken 발급
- API 요청에는 사용 안 함
- SecureStore에 안전하게 저장
```

### 흐름

```
AccessToken 발급 (1시간 만료)
    ↓
API 요청에 사용
    ↓
1시간 후 만료
    ↓
RefreshToken으로 새 AccessToken 요청
    ↓
새 AccessToken 발급 (1시간 만료)
    ↓
반복...
    ↓
7일 후 RefreshToken도 만료
    ↓
다시 로그인 필요
```

---

## 정리

### 백엔드 역할

```
카카오 ←→ 백엔드 ←→ DB
   ↑           ↑
   │           └─ 사용자 저장/조회
   │
   └─ 토큰 요청, 사용자 정보 조회
```

**책임:**

1. 카카오와 통신
2. 사용자 관리 (DB)
3. JWT 토큰 발급
4. API 엔드포인트 제공

### 프론트엔드 역할

```
사용자 ←→ 프론트엔드 ←→ 백엔드
   ↑           ↑
   │           └─ API 요청
   │
   └─ UI 표시, 입력 받기
```

**책임:**

1. UI 표시
2. 사용자 입력 처리
3. 백엔드 API 호출
4. 토큰 저장/관리
5. 화면 전환

### 데이터 흐름

```
사용자 입력 → UI 업데이트 → API 호출 → 백엔드 처리 → DB 저장 → 응답 → 토큰 저장 → 홈 화면
```

---

이 구조가 **스케일 가능**하고 **유지보수하기 쉬운** 이유:

1. **각 계층이 독립적** → 한 계층 변경 시 다른 계층 영향 최소
2. **책임 분리** → 각 계층이 하나의 책임만 가짐
3. **테스트 가능** → 각 계층을 따로 테스트 가능
4. **재사용 가능** → 다른 프로젝트에서도 패턴 적용 가능
