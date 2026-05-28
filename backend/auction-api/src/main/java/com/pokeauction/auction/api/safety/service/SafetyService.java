package com.pokeauction.auction.api.safety.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.chat.domain.ChatRoom;
import com.pokeauction.auction.api.chat.repository.ChatRoomRepository;
import com.pokeauction.auction.api.safety.domain.SafetyReport;
import com.pokeauction.auction.api.safety.domain.UserBlock;
import com.pokeauction.auction.api.safety.dto.BlockStatusResponse;
import com.pokeauction.auction.api.safety.dto.SafetyReportRequest;
import com.pokeauction.auction.api.safety.dto.SafetyReportResponse;
import com.pokeauction.auction.api.safety.repository.SafetyReportRepository;
import com.pokeauction.auction.api.safety.repository.UserBlockRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SafetyService {

    private final SafetyReportRepository safetyReportRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final AuctionRepository auctionRepository;
    private final ChatRoomRepository chatRoomRepository;

    @Transactional
    public SafetyReportResponse report(Long reporterId, SafetyReportRequest request) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("신고자를 찾을 수 없습니다."));
        User reportedUser = request.getReportedUserId() == null
                ? null
                : userRepository.findById(request.getReportedUserId()).orElse(null);
        Auction auction = request.getAuctionId() == null
                ? null
                : auctionRepository.findById(request.getAuctionId()).orElse(null);
        ChatRoom chatRoom = request.getChatRoomId() == null
                ? null
                : chatRoomRepository.findById(request.getChatRoomId()).orElse(null);

        SafetyReport report = safetyReportRepository.save(SafetyReport.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .auction(auction)
                .chatRoom(chatRoom)
                .reason(request.getReason().trim())
                .detail(request.getDetail() == null ? "" : request.getDetail().trim())
                .build());

        return SafetyReportResponse.from(report);
    }

    @Transactional
    public BlockStatusResponse block(Long blockerId, Long blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new IllegalArgumentException("본인은 차단할 수 없습니다.");
        }

        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        User blocked = userRepository.findById(blockedId)
                .orElseThrow(() -> new IllegalArgumentException("차단할 사용자를 찾을 수 없습니다."));

        userBlockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .orElseGet(() -> userBlockRepository.save(UserBlock.builder()
                        .blocker(blocker)
                        .blocked(blocked)
                        .build()));

        return BlockStatusResponse.builder()
                .userId(blockedId)
                .blocked(true)
                .build();
    }

    @Transactional
    public BlockStatusResponse unblock(Long blockerId, Long blockedId) {
        userBlockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .ifPresent(userBlockRepository::delete);

        return BlockStatusResponse.builder()
                .userId(blockedId)
                .blocked(false)
                .build();
    }

    @Transactional(readOnly = true)
    public BlockStatusResponse status(Long blockerId, Long blockedId) {
        return BlockStatusResponse.builder()
                .userId(blockedId)
                .blocked(userBlockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId))
                .build();
    }
}
