package com.pokeauction.auction.api.safety.dto;

import com.pokeauction.auction.api.safety.domain.SafetyReport;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SafetyReportResponse {

    private Long id;
    private String reason;
    private String status;
    private LocalDateTime createdAt;

    public static SafetyReportResponse from(SafetyReport report) {
        return SafetyReportResponse.builder()
                .id(report.getId())
                .reason(report.getReason())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
