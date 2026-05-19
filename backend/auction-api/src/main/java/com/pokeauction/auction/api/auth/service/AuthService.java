package com.pokeauction.auction.api.auth.service;

import com.pokeauction.auction.api.auth.client.KakaoClient;
import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.KakaoTokenResponse;
import com.pokeauction.auction.api.auth.dto.KakaoUserResponse;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final KakaoClient kakaoClient;
    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;

    @Transactional
    public LoginResponse kakaoLogin(KakaoLoginRequest request) {
        KakaoTokenResponse tokenResponse =
                kakaoClient.getToken(request.getCode(), request.getRedirectUri());

        if (tokenResponse == null || tokenResponse.getAccessToken() == null) {
            throw new RuntimeException("카카오 토큰 발급에 실패했습니다.");
        }

        KakaoUserResponse kakaoUser =
                kakaoClient.getUserInfo(tokenResponse.getAccessToken());

        if (kakaoUser == null || kakaoUser.getId() == null) {
            throw new RuntimeException("카카오 사용자 정보 조회에 실패했습니다.");
        }

        String provider = "KAKAO";
        String providerId = String.valueOf(kakaoUser.getId());

        User user = userRepository
                .findByProviderAndProviderId(provider, providerId)
                .orElse(null);

        boolean isNewUser = false;

        if (user == null) {
            isNewUser = true;

            String nickname = "안녕안녕" + providerId.substring(Math.max(0, providerId.length() - 4));

            user = userRepository.save(
                    User.builder()
                            .provider(provider)
                            .providerId(providerId)
                            .nickname(nickname)
                            .role("USER")
                            .build()
            );
        }

        String accessToken = jwtProvider.createAccessToken(user.getId());
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .nickname(user.getNickname())
                .isNewUser(isNewUser)
                .build();
    }
}