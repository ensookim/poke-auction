package com.pokeauction.auction.api.review.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SellerReviewSummaryResponse {

    private Long sellerId;
    private double averageRating;
    private long reviewCount;
}
