package com.pokeauction.auction.api.chat.dto;

import com.pokeauction.auction.api.chat.domain.ChatMessage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderNickname;
    private String content;
    private LocalDateTime createdAt;
    private boolean readByOther;

    public static ChatMessageResponse from(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .roomId(message.getRoom().getId())
                .senderId(message.getSender().getId())
                .senderNickname(message.getSender().getNickname())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .readByOther(message.getRoom().isReadByOther(message.getSender().getId(), message.getCreatedAt()))
                .build();
    }
}
