package com.pokeauction.auction.api.chat.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatSocketEvent {

    private String type;
    private Long roomId;
    private Long readerId;
    private ChatMessageResponse message;
    private String error;

    public static ChatSocketEvent message(ChatMessageResponse message) {
        return ChatSocketEvent.builder()
                .type("MESSAGE")
                .message(message)
                .build();
    }

    public static ChatSocketEvent joined(Long roomId) {
        return ChatSocketEvent.builder()
                .type("JOINED")
                .roomId(roomId)
                .build();
    }

    public static ChatSocketEvent read(Long roomId, Long readerId) {
        return ChatSocketEvent.builder()
                .type("READ")
                .roomId(roomId)
                .readerId(readerId)
                .build();
    }

    public static ChatSocketEvent error(String error) {
        return ChatSocketEvent.builder()
                .type("ERROR")
                .error(error)
                .build();
    }
}
