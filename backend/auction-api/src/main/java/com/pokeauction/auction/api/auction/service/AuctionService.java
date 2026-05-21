package com.pokeauction.auction.api.auction.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.bid.domain.Bid;
import com.pokeauction.auction.api.bid.repository.BidRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Comparator;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AuctionResponse> listAuctions(String category, String sort, boolean activeOnly) {
        String normalizedCategory = normalizeCategory(category);

        return auctionRepository.findAll().stream()
                .filter(auction -> !activeOnly || auction.isActive())
                .filter(auction -> normalizedCategory == null || normalizedCategory.equals(auction.getCardCategory()))
                .sorted(resolveAuctionComparator(sort))
                .map(AuctionResponse::from)
                .toList();
    }

    @Transactional
    public AuctionResponse createAuction(CreateAuctionRequest request, Long creatorId) {
        validateCreateAuctionRequest(request);

        User creator = null;
        if (creatorId != null) {
            creator = userRepository.findById(creatorId)
                    .orElseThrow(() -> new IllegalArgumentException("판매자 정보를 찾을 수 없습니다."));
        }

        Auction auction = Auction.builder()
                .cardName(request.getCardName())
                .cardDescription(request.getCardDescription())
                .cardRarity(request.getCardRarity())
                .cardCategory(normalizeCategoryOrDefault(request.getCardCategory()))
                .imageUrl(request.getImageUrl())
                .startingPrice(request.getStartingPrice())
                .currentPrice(request.getStartingPrice())
                .minimumIncrement(request.getMinimumIncrement())
                .buyNowPrice(request.getBuyNowPrice())
                .createdBy(creator)
                .endAt(LocalDateTime.now().plusHours(request.getDurationHours()))
                .build();

        Auction saved = auctionRepository.save(auction);
        return AuctionResponse.from(saved);
    }

    @Transactional
    public AuctionResponse placeBid(Long auctionId, Long bidderId, Long amount, String ipAddress, String deviceId, String userAgent) {
        if (amount == null) {
            throw new IllegalArgumentException("입찰 금액은 필수입니다.");
        }

        Auction auction = auctionRepository.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));

        if (!auction.isActive()) {
            throw new IllegalStateException("경매가 종료되었습니다.");
        }

        if (amount <= auction.getCurrentPrice()) {
            throw new IllegalArgumentException("입찰 금액은 현재가보다 커야 합니다.");
        }

        if (amount < auction.getCurrentPrice() + auction.getMinimumIncrement()) {
            throw new IllegalArgumentException("최소 입찰 단위보다 커야 합니다.");
        }

        User bidder = userRepository.findById(bidderId)
                .orElseThrow(() -> new IllegalArgumentException("입찰자 정보를 찾을 수 없습니다."));

        if (bidder.isBidRestrictedNow()) {
            throw new IllegalStateException("입찰이 제한된 사용자입니다.");
        }

        if (auction.getCreatedBy() != null && auction.getCreatedBy().getId().equals(bidderId)) {
            throw new IllegalArgumentException("자신의 경매에는 입찰할 수 없습니다.");
        }

        Bid bid = Bid.builder()
            .auction(auction)
            .bidder(bidder)
            .amount(amount)
            .ipAddress(ipAddress)
            .deviceId(deviceId)
            .userAgent(userAgent)
            .build();

        auction.placeBid(bid);
        bidRepository.save(bid);
        Auction saved = auctionRepository.save(auction);
        return AuctionResponse.from(saved);
    }

    @Transactional
    public AuctionResponse buyNow(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent) {
        Auction auction = auctionRepository.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));

        if (!auction.isActive()) {
            throw new IllegalStateException("경매가 종료되었습니다.");
        }

        if (!auction.hasBuyNow()) {
            throw new IllegalStateException("즉시 낙찰 옵션이 설정되지 않은 상품입니다.");
        }

        User bidder = userRepository.findById(buyerId)
                .orElseThrow(() -> new IllegalArgumentException("입찰자 정보를 찾을 수 없습니다."));

        if (bidder.isBidRestrictedNow()) {
            throw new IllegalStateException("입찰이 제한된 사용자입니다.");
        }

        if (auction.getCreatedBy() != null && auction.getCreatedBy().getId().equals(buyerId)) {
            throw new IllegalArgumentException("자신의 경매에는 입찰할 수 없습니다.");
        }

        Bid bid = Bid.builder()
            .auction(auction)
            .bidder(bidder)
            .amount(auction.getBuyNowPrice())
            .ipAddress(ipAddress)
            .deviceId(deviceId)
            .userAgent(userAgent)
            .build();

        auction.buyNow(bid);
        bidRepository.save(bid);
        Auction saved = auctionRepository.save(auction);
        return AuctionResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public AuctionResponse getAuctionDetails(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));
        return AuctionResponse.from(auction);
    }

    @Transactional(readOnly = true)
    public List<AuctionResponse> getAuctionsByBidder(Long bidderId) {
        List<Long> auctionIds = bidRepository.findByBidderId(bidderId).stream()
                .map(b -> b.getAuction().getId())
                .distinct()
                .toList();

        return auctionRepository.findAllById(auctionIds).stream()
                .map(AuctionResponse::from)
                .toList();
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void finalizeEndedAuctions() {
        List<Auction> ended = auctionRepository.findAll().stream()
                .filter(a -> a.getEndAt() != null && a.getEndAt().isBefore(LocalDateTime.now()) && a.getWinnerId() == null)
                .toList();

        for (Auction a : ended) {
            a.finalizeWinner();
            auctionRepository.save(a);
        }
    }

    private void validateCreateAuctionRequest(CreateAuctionRequest request) {
        if (request.getBuyNowPrice() != null && request.getBuyNowPrice() <= request.getStartingPrice()) {
            throw new IllegalArgumentException("즉시 낙찰가는 시작가보다 커야 합니다.");
        }
    }

    private Comparator<Auction> resolveAuctionComparator(String sort) {
        if ("new".equalsIgnoreCase(sort)) {
            return Comparator.comparing(Auction::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed();
        }

        if ("cheap".equalsIgnoreCase(sort)) {
            return Comparator.comparing(Auction::getCurrentPrice, Comparator.nullsLast(Comparator.naturalOrder()));
        }

        if ("ending".equalsIgnoreCase(sort)) {
            return Comparator.comparing(Auction::getEndAt, Comparator.nullsLast(Comparator.naturalOrder()));
        }

        return Comparator.comparingInt((Auction auction) -> auction.getBids() == null ? 0 : auction.getBids().size())
                .reversed()
                .thenComparing(Auction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private String normalizeCategoryOrDefault(String category) {
        String normalized = normalizeCategory(category);
        return normalized == null ? "SINGLE" : normalized;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank() || "ALL".equalsIgnoreCase(category)) {
            return null;
        }

        return category.trim().toUpperCase(Locale.ROOT);
    }
}
