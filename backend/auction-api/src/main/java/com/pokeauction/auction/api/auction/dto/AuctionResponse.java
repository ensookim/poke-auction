package com.pokeauction.auction.api.auction.dto;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.bid.dto.BidResponse;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AuctionResponse {

    private Long id;
    private String cardName;
    private String cardDescription;
    private String cardRarity;
    private String cardCategory;
    private String imageUrl;
    private String backImageUrl;
    private Long startingPrice;
    private Long currentPrice;
    private Long minimumIncrement;
    private Long buyNowPrice;
    private boolean active;
    private LocalDateTime endAt;
    private LocalDateTime createdAt;
    private Long creatorId;
    private String creatorNickname;
    private int bidCount;
    private long wishlistCount;
    private Long winnerId;
    private String paymentStatus;
    private Long paymentAmount;
    private LocalDateTime paidAt;
    private LocalDateTime releasedAt;
    private String trackingNumber;
    private String shippingCompany;
    private boolean receivedConfirmed;
    private LocalDateTime receivedConfirmedAt;
    private java.util.List<BidResponse> bids;

    public static AuctionResponse from(Auction auction) {
        return from(auction, 0L);
    }

    public static AuctionResponse from(Auction auction, long wishlistCount) {
        return AuctionResponse.builder()
                .id(auction.getId())
                .cardName(auction.getCardName())
                .cardDescription(auction.getCardDescription())
                .cardRarity(auction.getCardRarity())
                .cardCategory(auction.getCardCategory())
                .imageUrl(auction.getImageUrl())
                .backImageUrl(auction.getBackImageUrl())
                .startingPrice(auction.getStartingPrice())
                .currentPrice(auction.getCurrentPrice())
                .minimumIncrement(auction.getMinimumIncrement())
                .buyNowPrice(auction.getBuyNowPrice())
                .active(auction.isActive())
                .endAt(auction.getEndAt())
                .createdAt(auction.getCreatedAt())
                .creatorId(auction.getCreatedBy() != null ? auction.getCreatedBy().getId() : null)
                .creatorNickname(auction.getCreatedBy() != null ? auction.getCreatedBy().getNickname() : null)
                .bidCount(auction.getBids().size())
                .wishlistCount(wishlistCount)
                .winnerId(auction.getWinnerId())
                .paymentStatus(auction.getPaymentStatus() == null ? "NONE" : auction.getPaymentStatus().name())
                .paymentAmount(auction.getPaymentAmount())
                .paidAt(auction.getPaidAt())
                .releasedAt(auction.getReleasedAt())
                .trackingNumber(auction.getTrackingNumber())
                .shippingCompany(auction.getShippingCompany())
                .receivedConfirmed(auction.isReceivedConfirmed())
                .receivedConfirmedAt(auction.getReceivedConfirmedAt())
                .bids(auction.getBids().stream().map(BidResponse::from).toList())
                .build();
    }
}
