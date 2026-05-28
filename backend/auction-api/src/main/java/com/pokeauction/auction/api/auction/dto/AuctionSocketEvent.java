package com.pokeauction.auction.api.auction.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuctionSocketEvent {

    private String type;
    private Long auctionId;
    private AuctionResponse auction;
    private String error;

    public static AuctionSocketEvent joined(Long auctionId) {
        return AuctionSocketEvent.builder()
                .type("JOINED")
                .auctionId(auctionId)
                .build();
    }

    public static AuctionSocketEvent updated(Long auctionId, AuctionResponse auction) {
        return AuctionSocketEvent.builder()
                .type("UPDATED")
                .auctionId(auctionId)
                .auction(auction)
                .build();
    }

    public static AuctionSocketEvent error(String error) {
        return AuctionSocketEvent.builder()
                .type("ERROR")
                .error(error)
                .build();
    }
}
