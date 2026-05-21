package com.pokeauction.auction.api.auction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAuctionRequest {

    @NotBlank
    private String cardName;

    private String cardDescription;

    private String cardRarity;

    private String cardCategory;

    private String imageUrl;

    @NotNull
    @Min(1)
    private Long startingPrice;

    @NotNull
    @Min(1)
    private Long minimumIncrement;

    private Long buyNowPrice;

    @NotNull
    @Min(1)
    private Integer durationHours;
}
