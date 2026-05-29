package com.pokeauction.auction.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminReportStatusRequest {

    @NotBlank
    private String status;
}
