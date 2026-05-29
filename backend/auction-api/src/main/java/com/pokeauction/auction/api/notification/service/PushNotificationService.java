package com.pokeauction.auction.api.notification.service;

import com.pokeauction.auction.api.notification.domain.AppNotification;
import com.pokeauction.auction.api.notification.domain.UserPushToken;
import com.pokeauction.auction.api.notification.dto.AppNotificationResponse;
import com.pokeauction.auction.api.notification.repository.AppNotificationRepository;
import com.pokeauction.auction.api.notification.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
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
        String title = senderNickname == null || senderNickname.isBlank() ? "새 채팅" : senderNickname;
        String body = content == null || content.isBlank() ? "사진을 보냈어요." : content;
        send(userId, "CHAT", title, body, null, roomId);
    }

    public void sendAuctionNotification(Long userId, String type, String title, String body, Long auctionId) {
        send(userId, type, title, body, auctionId, null);
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

    private void send(Long userId, String type, String title, String body, Long auctionId, Long roomId) {
        if (userId == null) {
            return;
        }

        appNotificationRepository.save(AppNotification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .auctionId(auctionId)
                .chatRoomId(roomId)
                .build());

        List<UserPushToken> tokens = userPushTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            return;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        for (UserPushToken token : tokens) {
            Map<String, Object> data = new HashMap<>();
            data.put("type", type.toLowerCase());
            if (auctionId != null) data.put("auctionId", auctionId);
            if (roomId != null) data.put("roomId", roomId);

            Map<String, Object> pushBody = Map.of(
                    "to", token.getToken(),
                    "sound", "default",
                    "title", title,
                    "body", body,
                    "data", data
            );

            try {
                restTemplate.exchange(
                        EXPO_PUSH_URL,
                        HttpMethod.POST,
                        new HttpEntity<>(pushBody, headers),
                        String.class
                );
            } catch (RestClientException ignored) {
                // Push delivery is best-effort and should not block the core transaction.
            }
        }
    }
}
