package com.pokeauction.auction.api.notification.service;

import com.pokeauction.auction.api.notification.domain.UserPushToken;
import com.pokeauction.auction.api.notification.domain.AppNotification;
import com.pokeauction.auction.api.notification.dto.AppNotificationResponse;
import com.pokeauction.auction.api.notification.repository.AppNotificationRepository;
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
    private final AppNotificationRepository appNotificationRepository;
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
        String bodyText = content == null || content.isBlank() ? "사진을 보냈어요." : content;
        appNotificationRepository.save(AppNotification.builder()
                .userId(userId)
                .type("CHAT")
                .title(senderNickname == null || senderNickname.isBlank() ? "새 채팅" : senderNickname)
                .body(bodyText)
                .chatRoomId(roomId)
                .build());

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
                    "body", bodyText,
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

    public List<AppNotificationResponse> getNotifications(Long userId) {
        return appNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(AppNotificationResponse::from)
                .toList();
    }

    public void markAllRead(Long userId) {
        List<AppNotification> notifications = appNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(AppNotification::markRead);
        appNotificationRepository.saveAll(notifications);
    }
}
