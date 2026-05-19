package com.pokeauction.auction.api.admin.service;

import com.pokeauction.auction.api.admin.dto.SuspiciousWarning;
import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.bid.domain.Bid;
import com.pokeauction.auction.api.bid.repository.BidRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BidRepository bidRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SuspiciousWarning> detectSuspiciousPatterns() {
        List<Bid> allBids = bidRepository.findAll();

        // Map sellerId -> (bidderId -> count)
        Map<Long, Map<Long, Integer>> sellerBidCounts = new HashMap<>();

        for (Bid b : allBids) {
            Auction a = b.getAuction();
            if (a == null || a.getCreatedBy() == null || b.getBidder() == null) continue;
            Long sellerId = a.getCreatedBy().getId();
            Long bidderId = b.getBidder().getId();

            sellerBidCounts.computeIfAbsent(sellerId, k -> new HashMap<>());
            Map<Long, Integer> map = sellerBidCounts.get(sellerId);
            map.put(bidderId, map.getOrDefault(bidderId, 0) + 1);
        }

        List<SuspiciousWarning> warnings = new ArrayList<>();

        for (Map.Entry<Long, Map<Long, Integer>> e : sellerBidCounts.entrySet()) {
            Long sellerId = e.getKey();
            Map<Long, Integer> bidderCounts = e.getValue();

            for (Map.Entry<Long, Integer> bEntry : bidderCounts.entrySet()) {
                Long bidderId = bEntry.getKey();
                int count = bEntry.getValue();

                if (count >= 3) { // threshold
                    // calculate win rate for bidder
                    long wins = auctionRepository.findAll().stream()
                            .filter(au -> au.getWinnerId() != null && au.getWinnerId().equals(bidderId))
                            .count();
                    long totalBids = bidRepository.findByBidderId(bidderId).size();
                    double winRate = totalBids == 0 ? 0.0 : (double) wins / (double) totalBids;

                    String reason = "Multiple bids on same seller's auctions: " + count + " bids";
                    if (winRate < 0.2) {
                        reason += "; low win rate (" + String.format("%.2f", winRate) + ")";
                    }

                    warnings.add(new SuspiciousWarning(sellerId, bidderId, count, reason));
                }
            }
        }

        return warnings;
    }

    @Transactional
    public User markUnpaid(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        user.incrementUnpaidCount();
        int c = user.getUnpaidCount();
        if (c == 1) {
            // warning only
        } else if (c == 2) {
            user.applyRestrictionDays(7);
        } else if (c >= 3) {
            user.banPermanently();
        }

        return userRepository.save(user);
    }
}
