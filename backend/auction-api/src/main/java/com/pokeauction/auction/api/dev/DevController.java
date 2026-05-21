package com.pokeauction.auction.api.dev;

import com.pokeauction.auction.api.auth.dto.LoginResponse;
import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevController {

    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;

    @GetMapping("/token/{userId}")
    public ResponseEntity<String> token(@PathVariable Long userId) {
        String token = jwtProvider.createAccessToken(userId);
        return ResponseEntity.ok(token);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login() {
        User user = userRepository.findByProviderAndProviderId("DEV", "local-user")
                .orElseGet(() -> userRepository.save(User.builder()
                        .provider("DEV")
                        .providerId("local-user")
                        .nickname("테스트유저")
                        .role("USER")
                        .build()));

        return ResponseEntity.ok(LoginResponse.builder()
                .accessToken(jwtProvider.createAccessToken(user.getId()))
                .refreshToken(jwtProvider.createRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .isNewUser(false)
                .build());
    }
}
