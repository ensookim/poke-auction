# PokeAuction

Pokemon card auction app with Kakao login, category-based auction discovery, bidding, buy-now support, admin guardrails, and 1:1 buyer-seller chat.

## Features

- Kakao OAuth login with JWT access and refresh tokens
- Auction listing, detail, creation, bidding, and buy-now
- Categories: single cards, sealed products, graded cards, and promos
- Auction sorting by popularity, closing time, newest, and lowest price
- Seller/buyer guardrails including self-bid prevention and bid restrictions
- Admin suspicious-bid review and unpaid-user restriction endpoints
- Realtime 1:1 chat through WebSocket plus REST history APIs
- Expo mobile app with home, market, sell, chat, my-bids, and detail screens

## Project Structure

```text
poke-auction/
  backend/auction-api/   Spring Boot auction API
  apps/mobile/           Expo React Native app
  infra/                 Local infrastructure files
  docs/                  Project notes
```

## Backend

The backend is a Spring Boot 3 application using Java 17, Spring Web, Spring Security, Spring Data JPA, WebSocket, PostgreSQL, and JWT.

Required environment variables are loaded from `backend/auction-api/.env`:

```properties
KAKAO_REST_API_KEY=...
KAKAO_CLIENT_SECRET=...
JWT_SECRET_KEY=...
```

Run the API:

```bash
cd backend/auction-api
./gradlew bootRun
```

Run tests:

```bash
cd backend/auction-api
./gradlew test
```

Main API areas:

- `GET /api/auctions`
- `POST /api/auctions`
- `POST /api/auctions/{id}/bid`
- `POST /api/auctions/{id}/buy-now`
- `POST /api/chats/auctions/{auctionId}/rooms`
- `GET /api/chats/rooms`
- `GET /api/chats/rooms/{roomId}/messages`
- `WS /ws/chat?token={accessToken}`

## Mobile App

The mobile app is built with Expo Router and React Native.

Required local environment file: `apps/mobile/.env`

```properties
EXPO_PUBLIC_KAKAO_APP_ID=...
EXPO_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:8081/kakao/callback
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080
```

Run the app:

```bash
cd apps/mobile
npm install
npm run web
```

Quality checks:

```bash
cd apps/mobile
npm run lint
npx tsc --noEmit
```

## Kakao Login Notes

For Kakao login to work, the redirect URI in Kakao Developers must exactly match `EXPO_PUBLIC_KAKAO_REDIRECT_URI`.

For local web testing, run Expo on the matching port or update both places together.

## Security Notes

Do not commit `.env` files. This repository ignores environment files and build artifacts by default.
