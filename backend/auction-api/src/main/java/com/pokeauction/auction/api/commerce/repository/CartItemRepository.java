package com.pokeauction.auction.api.commerce.repository;

import com.pokeauction.auction.api.commerce.domain.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<CartItem> findByUserIdAndAuctionId(Long userId, Long auctionId);

    boolean existsByUserIdAndAuctionId(Long userId, Long auctionId);

    void deleteByUserIdAndAuctionId(Long userId, Long auctionId);
}
