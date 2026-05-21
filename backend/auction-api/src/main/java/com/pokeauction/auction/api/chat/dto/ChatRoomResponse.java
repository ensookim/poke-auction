package com.pokeauction.auction.api.chat.dto;

import com.pokeauction.auction.api.chat.domain.ChatRoom;
import com.pokeauction.auction.api.user.domain.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatRoomResponse {

    private Long id;
    private Long auctionId;
    private String auctionCardName;
    private String auctionImageUrl;
    private Long sellerId;
    private Long buyerId;
    private Long otherUserId;
    private String otherUserNickname;
    private String lastMessagePreview;
    private LocalDateTime lastMessageAt;

    public static ChatRoomResponse from(ChatRoom room, Long currentUserId) {
        User other = room.otherParticipant(currentUserId);

        return ChatRoomResponse.builder()
                .id(room.getId())
                .auctionId(room.getAuction().getId())
                .auctionCardName(room.getAuction().getCardName())
                .auctionImageUrl(room.getAuction().getImageUrl())
                .sellerId(room.getSeller().getId())
                .buyerId(room.getBuyer().getId())
                .otherUserId(other.getId())
                .otherUserNickname(other.getNickname())
                .lastMessagePreview(room.getLastMessagePreview())
                .lastMessageAt(room.getLastMessageAt())
                .build();
    }
}
