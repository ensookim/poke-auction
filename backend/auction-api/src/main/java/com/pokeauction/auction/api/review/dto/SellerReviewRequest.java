package com.pokeauction.auction.api.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SellerReviewRequest {

    @NotNull
    private Long auctionId;

    @Min(1)
    @Max(5)
    private int rating;

    @Size(max = 500)
    private String content;
}
