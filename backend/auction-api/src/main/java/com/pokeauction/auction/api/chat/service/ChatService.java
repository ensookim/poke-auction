package com.pokeauction.auction.api.chat.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.chat.domain.ChatMessage;
import com.pokeauction.auction.api.chat.domain.ChatRoom;
import com.pokeauction.auction.api.chat.dto.ChatMessageResponse;
import com.pokeauction.auction.api.chat.dto.ChatRoomResponse;
import com.pokeauction.auction.api.chat.repository.ChatMessageRepository;
import com.pokeauction.auction.api.chat.repository.ChatRoomRepository;
import com.pokeauction.auction.api.notification.service.PushNotificationService;
import com.pokeauction.auction.api.safety.repository.UserBlockRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserBlockRepository userBlockRepository;
    private final PushNotificationService pushNotificationService;

    @Transactional
    public ChatRoomResponse createOrGetRoom(Long auctionId, Long buyerId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

        if (auction.getCreatedBy() == null) {
            throw new IllegalStateException("판매자 정보가 없는 경매입니다.");
        }

        if (auction.getCreatedBy().getId().equals(buyerId)) {
            throw new IllegalArgumentException("자신의 상품에는 문의할 수 없습니다.");
        }

        if (isBlockedBetween(auction.getCreatedBy().getId(), buyerId)) {
            throw new IllegalStateException("차단된 사용자와는 채팅할 수 없습니다.");
        }

        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new IllegalArgumentException("구매자 정보를 찾을 수 없습니다."));

        ChatRoom room = chatRoomRepository.findByAuctionIdAndBuyerId(auctionId, buyerId)
                .orElseGet(() -> chatRoomRepository.save(ChatRoom.builder()
                        .auction(auction)
                        .seller(auction.getCreatedBy())
                        .buyer(buyer)
                        .build()));

        return ChatRoomResponse.from(room, buyerId);
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyRooms(Long userId) {
        return chatRoomRepository.findBySellerIdOrBuyerIdOrderByLastMessageAtDesc(userId, userId).stream()
                .map(room -> ChatRoomResponse.from(room, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(Long roomId, Long userId) {
        ChatRoom room = getRoomForParticipant(roomId, userId);
        room.markRead(userId);
        chatRoomRepository.save(room);
        return chatMessageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId()).stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, Long senderId, String content, String imageUrl) {
        String trimmedContent = content == null ? "" : content.trim();
        String trimmedImageUrl = imageUrl == null ? "" : imageUrl.trim();
        if (trimmedContent.isEmpty() && trimmedImageUrl.isEmpty()) {
            throw new IllegalArgumentException("메시지를 입력해주세요.");
        }

        if (trimmedContent.length() > 1000) {
            throw new IllegalArgumentException("메시지는 1000자 이하로 입력해주세요.");
        }

        ChatRoom room = getRoomForParticipant(roomId, senderId);
        if (isBlockedBetween(senderId, room.otherParticipant(senderId).getId())) {
            throw new IllegalStateException("차단된 사용자와는 메시지를 보낼 수 없습니다.");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .room(room)
                .sender(sender)
                .content(trimmedContent.isEmpty() ? "사진" : trimmedContent)
                .imageUrl(trimmedImageUrl.isEmpty() ? null : trimmedImageUrl)
                .build());

        String preview = trimmedImageUrl.isEmpty() ? trimmedContent : "사진을 보냈어요.";
        room.updateLastMessage(preview);
        chatRoomRepository.save(room);

        ChatMessageResponse response = ChatMessageResponse.from(message);
        pushNotificationService.sendChatMessage(
                room.otherParticipant(senderId).getId(),
                room.getId(),
                sender.getNickname(),
                preview
        );
        return response;
    }

    @Transactional(readOnly = true)
    public void assertParticipant(Long roomId, Long userId) {
        getRoomForParticipant(roomId, userId);
    }

    @Transactional
    public void markRead(Long roomId, Long userId) {
        ChatRoom room = getRoomForParticipant(roomId, userId);
        room.markRead(userId);
        chatRoomRepository.save(room);
    }

    @Transactional(readOnly = true)
    public Long getOtherParticipantId(Long roomId, Long userId) {
        return getRoomForParticipant(roomId, userId).otherParticipant(userId).getId();
    }

    private ChatRoom getRoomForParticipant(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("문의 내역을 찾을 수 없습니다."));

        if (!room.hasParticipant(userId)) {
            throw new IllegalArgumentException("이 문의에 접근할 수 없습니다.");
        }

        return room;
    }
    private boolean isBlockedBetween(Long userId, Long otherUserId) {
        return userBlockRepository.existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(
                userId,
                otherUserId,
                otherUserId,
                userId
        );
    }
}
