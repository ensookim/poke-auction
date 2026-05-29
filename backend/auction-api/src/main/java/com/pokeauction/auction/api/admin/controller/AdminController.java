package com.pokeauction.auction.api.admin.controller;

import com.pokeauction.auction.api.admin.dto.AdminReportStatusRequest;
import com.pokeauction.auction.api.admin.dto.SuspiciousWarning;
import com.pokeauction.auction.api.admin.service.AdminService;
import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.safety.dto.SafetyReportResponse;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;

    @GetMapping("/suspicious")
    public List<SuspiciousWarning> suspicious(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        resolveAdmin(authorization);
        return adminService.detectSuspiciousPatterns();
    }

    @PostMapping("/unpaid/{userId}")
    public User markUnpaid(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        resolveAdmin(authorization);
        return adminService.markUnpaid(userId);
    }

    @GetMapping("/reports")
    public List<SafetyReportResponse> reports(
            @RequestParam(required = false) String status,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        resolveAdmin(authorization);
        return adminService.getReports(status);
    }

    @PatchMapping("/reports/{reportId}/status")
    public SafetyReportResponse updateReportStatus(
            @PathVariable Long reportId,
            @RequestBody @Valid AdminReportStatusRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        resolveAdmin(authorization);
        return adminService.updateReportStatus(reportId, request.getStatus());
    }

    private User resolveAdmin(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        String token = authorization.substring(7);
        if (!jwtProvider.validateToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }

        User user = userRepository.findById(jwtProvider.parseUserId(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자 정보를 찾을 수 없습니다."));

        if (!"ADMIN".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }

        return user;
    }
}
