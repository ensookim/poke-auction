package com.pokeauction.auction.api.admin.controller;

import com.pokeauction.auction.api.admin.dto.SuspiciousWarning;
import com.pokeauction.auction.api.admin.service.AdminService;
import com.pokeauction.auction.api.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/suspicious")
    public List<SuspiciousWarning> suspicious() {
        return adminService.detectSuspiciousPatterns();
    }

    @PostMapping("/unpaid/{userId}")
    public User markUnpaid(@PathVariable Long userId) {
        return adminService.markUnpaid(userId);
    }
}
