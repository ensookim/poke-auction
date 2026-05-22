# CardBid

트레이딩 카드, 스포츠 카드, 그레이딩 카드, 한정판 카드를 경매 방식으로 거래할 수 있는 앱입니다.
카카오 로그인, 카테고리 기반 경매 탐색, 입찰, 즉시 구매, 관리자 안전장치, 구매자-판매자 간 1:1 채팅 기능을 제공합니다.

## 주요 기능

- 카카오 OAuth 로그인 및 JWT Access Token / Refresh Token 발급
- 경매 목록 조회, 상세 조회, 경매 등록, 입찰, 즉시 구매 기능
- 카테고리 분류: 트레이딩 카드, 미개봉 상품, PSA/BGS/CGC 등급 카드, 한정판 카드
- 인기순, 마감 임박순, 최신순, 낮은 가격순 정렬
- 판매자/구매자 보호 기능
  - 본인 경매 입찰 방지
  - 입찰 제한 조건 처리
- 관리자 기능
  - 의심 입찰 검토
  - 미결제 사용자 제한 API
- WebSocket 기반 실시간 1:1 채팅
- REST API 기반 채팅 내역 조회
- Expo 모바일 앱 화면 구성
  - 홈
  - 마켓
  - 판매 등록
  - 채팅
  - 내 입찰
  - 경매 상세 화면

## 프로젝트 구조

poke-auction/
  backend/auction-api/   Spring Boot 기반 경매 API 서버
  apps/mobile/           Expo React Native 모바일 앱
  infra/                 로컬 인프라 설정 파일
  docs/                  프로젝트 문서 및 정리 자료.
  
## 백엔드

Java 17, Spring Web, Spring Security, Spring Data JPA, WebSocket, PostgreSQL, JWT


API 서버 실행:

cd backend/auction-api
./gradlew bootRun

테스트 실행:

cd backend/auction-api
./gradlew test

주요 API:

GET /api/auctions
경매 목록 조회
POST /api/auctions
경매 등록
POST /api/auctions/{id}/bid
경매 입찰
POST /api/auctions/{id}/buy-now
즉시 구매
POST /api/chats/auctions/{auctionId}/rooms
특정 경매의 채팅방 생성 또는 조회
GET /api/chats/rooms
내 채팅방 목록 조회
GET /api/chats/rooms/{roomId}/messages
채팅 메시지 내역 조회
WS /ws/chat?token={accessToken}
WebSocket 채팅 연결

## 프론트

npm install
npm run web

코드 품질 검사:

cd apps/mobile
npm run lint
npx tsc --noEmit

카카오 로그인 설정 참고

카카오 로그인이 정상적으로 동작하려면 Kakao Developers에 등록한 Redirect URI와
EXPO_PUBLIC_KAKAO_REDIRECT_URI 값이 정확히 일치해야 합니다.

로컬 웹 환경에서 테스트할 경우, Expo 실행 포트와 Redirect URI의 포트가 동일해야 합니다.
포트를 변경했다면 Kakao Developers 설정과 .env 파일 값을 함께 수정해야 합니다.

보안 참고 사항

.env 파일은 절대 Git에 커밋하면 안 됩니다.
이 프로젝트는 환경 변수 파일과 빌드 결과물이 Git에 올라가지 않도록 기본적으로 .gitignore에 포함하고 있습니다.
