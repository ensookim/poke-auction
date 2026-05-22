package com.pokeauction.auction.api.commerce.dto;

import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.commerce.domain.CartItem;
import com.pokeauction.auction.api.commerce.domain.WishlistItem;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CollectionItemResponse {
    private Long id;
    private AuctionResponse auction;
    private LocalDateTime createdAt;

    public static CollectionItemResponse from(WishlistItem item) {
        return CollectionItemResponse.builder()
                .id(item.getId())
                .auction(AuctionResponse.from(item.getAuction()))
                .createdAt(item.getCreatedAt())
                .build();
    }

    public static CollectionItemResponse from(CartItem item) {
        return CollectionItemResponse.builder()
                .id(item.getId())
                .auction(AuctionResponse.from(item.getAuction()))
                .createdAt(item.getCreatedAt())
                .build();
    }
}
