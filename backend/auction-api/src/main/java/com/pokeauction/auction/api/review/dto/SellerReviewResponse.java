package com.pokeauction.auction.api.review.dto;

import com.pokeauction.auction.api.review.domain.SellerReview;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SellerReviewResponse {

    private Long id;
    private Long sellerId;
    private Long reviewerId;
    private String reviewerNickname;
    private Long auctionId;
    private String auctionCardName;
    private int rating;
    private String content;
    private LocalDateTime createdAt;

    public static SellerReviewResponse from(SellerReview review) {
        return SellerReviewResponse.builder()
                .id(review.getId())
                .sellerId(review.getSeller().getId())
                .reviewerId(review.getReviewer().getId())
                .reviewerNickname(review.getReviewer().getNickname())
                .auctionId(review.getAuction().getId())
                .auctionCardName(review.getAuction().getCardName())
                .rating(review.getRating())
                .content(review.getContent())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
