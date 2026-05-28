package com.pokeauction.auction.api.notification.service;

import com.pokeauction.auction.api.notification.domain.UserPushToken;
import com.pokeauction.auction.api.notification.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final UserPushTokenRepository userPushTokenRepository;
    private final RestTemplate restTemplate;

    public void registerToken(Long userId, String token, String platform) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Push token is required.");
        }

        UserPushToken pushToken = userPushTokenRepository.findByToken(token)
                .orElseGet(() -> UserPushToken.builder()
                        .token(token)
                        .build());
        pushToken.update(userId, platform);
        userPushTokenRepository.save(pushToken);
    }

    public void sendChatMessage(Long userId, Long roomId, String senderNickname, String content) {
        List<UserPushToken> tokens = userPushTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            return;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        for (UserPushToken token : tokens) {
            Map<String, Object> body = Map.of(
                    "to", token.getToken(),
                    "sound", "default",
                    "title", senderNickname == null || senderNickname.isBlank() ? "새 채팅" : senderNickname,
                    "body", content == null ? "새 메시지가 도착했어요." : content,
                    "data", Map.of(
                            "type", "chat",
                            "roomId", roomId
                    )
            );

            try {
                restTemplate.exchange(
                        EXPO_PUSH_URL,
                        HttpMethod.POST,
                        new HttpEntity<>(body, headers),
                        String.class
                );
            } catch (RestClientException ignored) {
                // Push delivery is best-effort and should not block chat delivery.
            }
        }
    }
}
