package com.pokeauction.auction.api.safety.dto;

import com.pokeauction.auction.api.safety.domain.SafetyReport;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SafetyReportResponse {

    private Long id;
    private Long reporterId;
    private Long reportedUserId;
    private Long auctionId;
    private Long chatRoomId;
    private String reason;
    private String detail;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SafetyReportResponse from(SafetyReport report) {
        return SafetyReportResponse.builder()
                .id(report.getId())
                .reporterId(report.getReporter() == null ? null : report.getReporter().getId())
                .reportedUserId(report.getReportedUser() == null ? null : report.getReportedUser().getId())
                .auctionId(report.getAuction() == null ? null : report.getAuction().getId())
                .chatRoomId(report.getChatRoom() == null ? null : report.getChatRoom().getId())
                .reason(report.getReason())
                .detail(report.getDetail())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}
