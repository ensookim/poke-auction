package com.pokeauction.auction.api.auth.service;

import com.pokeauction.auction.api.auth.client.KakaoClient;
import com.pokeauction.auction.api.auth.dto.KakaoLoginRequest;
import com.pokeauction.auction.api.auth.dto.KakaoTokenResponse;
import com.pokeauction.auction.api.auth.dto.KakaoUserResponse;
import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.dto.RefreshTokenRequest;
import com.pokeauction.auction.api.auth.dto.UpdateNicknameRequest;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int NICKNAME_MIN_LENGTH = 2;
    private static final int NICKNAME_MAX_LENGTH = 12;

    private final KakaoClient kakaoClient;
    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;

    @Transactional
    public LoginResponse kakaoLogin(KakaoLoginRequest request) {
        KakaoTokenResponse tokenResponse = kakaoClient.getToken(request.getCode(), request.getRedirectUri());

        if (tokenResponse == null || tokenResponse.getAccessToken() == null) {
            throw new RuntimeException("카카오 토큰 발급에 실패했습니다.");
        }

        KakaoUserResponse kakaoUser = kakaoClient.getUserInfo(tokenResponse.getAccessToken());
        if (kakaoUser == null || kakaoUser.getId() == null) {
            throw new RuntimeException("카카오 사용자 정보 조회에 실패했습니다.");
        }

        String provider = "KAKAO";
        String providerId = String.valueOf(kakaoUser.getId());

        User user = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
        boolean isNewUser = false;

        if (user == null) {
            isNewUser = true;
            user = userRepository.save(
                    User.builder()
                            .provider(provider)
                            .providerId(providerId)
                            .nickname("")
                            .role("USER")
                            .build()
            );
        }

        return LoginResponse.builder()
                .accessToken(jwtProvider.createAccessToken(user.getId()))
                .refreshToken(jwtProvider.createRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .isNewUser(isNewUser)
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse refresh(RefreshTokenRequest request) {
        if (request == null || request.getRefreshToken() == null || request.getRefreshToken().isBlank()) {
            throw new IllegalArgumentException("refreshToken이 필요합니다.");
        }

        String refreshToken = request.getRefreshToken();
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 refreshToken입니다.");
        }

        Long userId = jwtProvider.parseUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        return LoginResponse.builder()
                .accessToken(jwtProvider.createAccessToken(user.getId()))
                .refreshToken(jwtProvider.createRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .isNewUser(false)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String rawNickname) {
        String nickname = normalizeNickname(rawNickname);
        validateNickname(nickname);
        return !userRepository.existsByNicknameIgnoreCase(nickname);
    }

    @Transactional
    public LoginResponse updateNickname(Long userId, UpdateNicknameRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("nickname이 필요합니다.");
        }

        String nickname = normalizeNickname(request.getNickname());
        validateNickname(nickname);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        boolean sameNickname = user.getNickname() != null && user.getNickname().equalsIgnoreCase(nickname);
        if (!sameNickname && userRepository.existsByNicknameIgnoreCase(nickname)) {
            throw new IllegalArgumentException("이미 사용중인 닉네임입니다.");
        }

        user.changeNickname(nickname);

        return LoginResponse.builder()
                .accessToken(jwtProvider.createAccessToken(user.getId()))
                .refreshToken(jwtProvider.createRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .isNewUser(false)
                .build();
    }

    private String normalizeNickname(String nickname) {
        return nickname == null ? "" : nickname.trim();
    }

    private void validateNickname(String nickname) {
        if (nickname.isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해주세요.");
        }
        if (nickname.length() < NICKNAME_MIN_LENGTH || nickname.length() > NICKNAME_MAX_LENGTH) {
            throw new IllegalArgumentException("닉네임은 2자 이상 12자 이하로 입력해주세요.");
        }
    }
}
