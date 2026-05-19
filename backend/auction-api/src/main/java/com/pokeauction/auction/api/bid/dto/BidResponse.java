package com.pokeauction.auction.api.bid.dto;

import com.pokeauction.auction.api.bid.domain.Bid;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class BidResponse {
    private Long id;
    private Long auctionId;
    private Long bidderId;
    private Long amount;
    private LocalDateTime createdAt;

    public static BidResponse from(Bid bid) {
        return BidResponse.builder()
                .id(bid.getId())
                .auctionId(bid.getAuction().getId())
                .bidderId(bid.getBidder() != null ? bid.getBidder().getId() : null)
                .amount(bid.getAmount())
                .createdAt(bid.getCreatedAt())
                .build();
    }
}