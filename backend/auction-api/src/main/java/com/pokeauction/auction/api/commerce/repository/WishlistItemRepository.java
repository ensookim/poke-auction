package com.pokeauction.auction.api.commerce.repository;

import com.pokeauction.auction.api.commerce.domain.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {
    List<WishlistItem> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<WishlistItem> findByUserIdAndAuctionId(Long userId, Long auctionId);

    boolean existsByUserIdAndAuctionId(Long userId, Long auctionId);

    void deleteByUserIdAndAuctionId(Long userId, Long auctionId);
}
