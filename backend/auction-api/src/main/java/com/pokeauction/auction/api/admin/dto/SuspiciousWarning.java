package com.pokeauction.auction.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SuspiciousWarning {
    private Long sellerId;
    private Long bidderId;
    private int bidCount;
    private String reason;
}
