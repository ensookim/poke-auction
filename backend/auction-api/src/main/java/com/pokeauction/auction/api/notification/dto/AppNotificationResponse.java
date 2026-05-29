package com.pokeauction.auction.api.notification.dto;

import com.pokeauction.auction.api.notification.domain.AppNotification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AppNotificationResponse {

    private Long id;
    private String type;
    private String title;
    private String body;
    private Long auctionId;
    private Long chatRoomId;
    private boolean read;
    private LocalDateTime createdAt;

    public static AppNotificationResponse from(AppNotification notification) {
        return AppNotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .body(notification.getBody())
                .auctionId(notification.getAuctionId())
                .chatRoomId(notification.getChatRoomId())
                .read(notification.getReadAt() != null)
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
