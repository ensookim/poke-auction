package com.pokeauction.auction.api.safety.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SafetyReportRequest {

    private Long reportedUserId;

    private Long auctionId;

    private Long chatRoomId;

    @NotBlank
    private String reason;

    @Size(max = 1000)
    private String detail;
}
