package com.pokeauction.auction.api.chat.repository;

import com.pokeauction.auction.api.chat.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByAuctionIdAndBuyerId(Long auctionId, Long buyerId);

    List<ChatRoom> findBySellerIdOrBuyerIdOrderByLastMessageAtDesc(Long sellerId, Long buyerId);
}
