package com.pokeauction.auction.api.auction.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.dto.ShippingInfoRequest;
import com.pokeauction.auction.api.auction.dto.TrackingInfoRequest;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.bid.domain.Bid;
import com.pokeauction.auction.api.bid.repository.BidRepository;
import com.pokeauction.auction.api.chat.domain.ChatMessage;
import com.pokeauction.auction.api.chat.domain.ChatRoom;
import com.pokeauction.auction.api.chat.repository.ChatMessageRepository;
import com.pokeauction.auction.api.chat.repository.ChatRoomRepository;
import com.pokeauction.auction.api.commerce.repository.WishlistItemRepository;
import com.pokeauction.auction.api.safety.repository.UserBlockRepository;
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
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final UserBlockRepository userBlockRepository;

    @Transactional(readOnly = true)
    public List<AuctionResponse> listAuctions(String category, String sort, boolean activeOnly) {
        String normalizedCategory = normalizeCategory(category);

        return auctionRepository.findAll().stream()
                .filter(auction -> !activeOnly || auction.isActive())
                .filter(auction -> normalizedCategory == null || normalizedCategory.equals(auction.getCardCategory()))
                .sorted(resolveAuctionComparator(sort))
                .map(this::toResponse)
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
        return toResponse(saved);
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

        if (auction.getCreatedBy() != null && isBlockedBetween(auction.getCreatedBy().getId(), bidderId)) {
            throw new IllegalStateException("차단된 판매자의 경매에는 입찰할 수 없습니다.");
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
        return toResponse(saved);
    }

    @Transactional
    public AuctionResponse buyNow(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent) {
        Auction saved = buyNowInternal(auctionId, buyerId, ipAddress, deviceId, userAgent, false);
        return toResponse(saved);
    }

    @Transactional
    public AuctionResponse buyNowWithSafePayment(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent) {
        Auction saved = buyNowInternal(auctionId, buyerId, ipAddress, deviceId, userAgent, true);
        return toResponse(saved);
    }

    @Transactional
    public AuctionResponse payAuction(Long auctionId, Long buyerId) {
        Auction auction = auctionRepository.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("?대떦 寃쎈ℓ瑜?李얠쓣 ???놁뒿?덈떎."));

        if (auction.getWinnerId() == null || !auction.getWinnerId().equals(buyerId)) {
            throw new IllegalStateException("?숈같?먮쭔 寃곗젣?????덉뒿?덈떎.");
        }

        auction.markPaymentPending();
        auction.holdPayment();
        return toResponse(auctionRepository.save(auction));
    }

    private Auction buyNowInternal(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent, boolean holdPayment) {
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

        if (auction.getCreatedBy() != null && isBlockedBetween(auction.getCreatedBy().getId(), buyerId)) {
            throw new IllegalStateException("차단된 판매자의 경매에는 즉시 낙찰할 수 없습니다.");
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
        if (holdPayment) {
            auction.holdPayment();
        }
        bidRepository.save(bid);
        return auctionRepository.save(auction);
    }

    @Transactional(readOnly = true)
    public AuctionResponse getAuctionDetails(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));
        return toResponse(auction);
    }

    @Transactional
    public void deleteAuction(Long auctionId, Long userId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));

        if (auction.getCreatedBy() == null || !auction.getCreatedBy().getId().equals(userId)) {
            throw new IllegalStateException("본인이 등록한 경매만 삭제할 수 있습니다.");
        }

        auctionRepository.delete(auction);
    }

    @Transactional
    public AuctionResponse submitShippingInfo(Long auctionId, Long buyerId, ShippingInfoRequest request) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));

        if (auction.getWinnerId() == null || !auction.getWinnerId().equals(buyerId)) {
            throw new IllegalStateException("낙찰자만 배송 정보를 입력할 수 있습니다.");
        }

        if (!auction.isPaymentHeld()) {
            throw new IllegalStateException("Safe payment must be held before shipping info can be submitted.");
        }

        if (auction.getCreatedBy() == null) {
            throw new IllegalStateException("판매자 정보가 없는 경매입니다.");
        }

        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new IllegalArgumentException("구매자 정보를 찾을 수 없습니다."));

        ChatRoom room = chatRoomRepository.findByAuctionIdAndBuyerId(auctionId, buyerId)
                .orElseGet(() -> chatRoomRepository.save(ChatRoom.builder()
                        .auction(auction)
                        .seller(auction.getCreatedBy())
                        .buyer(buyer)
                        .build()));

        String content = """
                [배송정보]
                수령인: %s
                연락처: %s
                주소: %s %s
                요청사항: %s
                """.formatted(
                request.getRecipientName().trim(),
                request.getPhoneNumber().trim(),
                request.getAddress().trim(),
                request.getAddressDetail() == null ? "" : request.getAddressDetail().trim(),
                request.getDeliveryMemo() == null || request.getDeliveryMemo().isBlank()
                        ? "없음"
                        : request.getDeliveryMemo().trim()
        ).trim();

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .room(room)
                .sender(buyer)
                .content(content)
                .build());

        room.updateLastMessage(message.getContent());
        chatRoomRepository.save(room);

        return toResponse(auction);
    }

    @Transactional
    public AuctionResponse submitTrackingInfo(Long auctionId, Long sellerId, TrackingInfoRequest request) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

        if (auction.getCreatedBy() == null || !auction.getCreatedBy().getId().equals(sellerId)) {
            throw new IllegalStateException("판매자만 송장 정보를 입력할 수 있습니다.");
        }

        if (auction.getWinnerId() == null) {
            throw new IllegalStateException("낙찰자가 있는 거래에만 송장 정보를 입력할 수 있습니다.");
        }

        if (!auction.isPaymentHeld()) {
            throw new IllegalStateException("Safe payment must be held before tracking info can be submitted.");
        }

        auction.updateTracking(request.getShippingCompany().trim(), request.getTrackingNumber().trim());
        Auction saved = auctionRepository.save(auction);

        ChatRoom room = chatRoomRepository.findByAuctionIdAndBuyerId(auctionId, auction.getWinnerId())
                .orElse(null);
        if (room != null) {
            ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                    .room(room)
                    .sender(auction.getCreatedBy())
                    .content("[송장정보]\n택배사: %s\n송장번호: %s".formatted(
                            request.getShippingCompany().trim(),
                            request.getTrackingNumber().trim()
                    ))
                    .build());
            room.updateLastMessage(message.getContent());
            chatRoomRepository.save(room);
        }

        return toResponse(saved);
    }

    @Transactional
    public AuctionResponse confirmReceived(Long auctionId, Long buyerId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

        if (auction.getWinnerId() == null || !auction.getWinnerId().equals(buyerId)) {
            throw new IllegalStateException("낙찰자만 수령 확인을 할 수 있습니다.");
        }

        if (!auction.isPaymentHeld()) {
            throw new IllegalStateException("Safe payment must be held before confirming receipt.");
        }

        auction.confirmReceived();
        return toResponse(auctionRepository.save(auction));
    }

    @Transactional(readOnly = true)
    public List<AuctionResponse> getAuctionsByBidder(Long bidderId) {
        List<Long> auctionIds = bidRepository.findByBidderId(bidderId).stream()
                .map(b -> b.getAuction().getId())
                .distinct()
                .toList();

        return auctionRepository.findAllById(auctionIds).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuctionResponse> getAuctionsByCreator(Long creatorId) {
        return auctionRepository.findAll().stream()
                .filter(auction -> auction.getCreatedBy() != null && auction.getCreatedBy().getId().equals(creatorId))
                .sorted(Comparator.comparing(Auction::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::toResponse)
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

    private AuctionResponse toResponse(Auction auction) {
        long wishlistCount = auction.getId() == null ? 0L : wishlistItemRepository.countByAuctionId(auction.getId());
        return AuctionResponse.from(auction, wishlistCount);
    }

    private boolean isBlockedBetween(Long userId, Long otherUserId) {
        return userBlockRepository.existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(
                userId,
                otherUserId,
                otherUserId,
                userId
        );
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
        return normalized == null ? "POKEMON" : normalized;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank() || "ALL".equalsIgnoreCase(category)) {
            return null;
        }

        return category.trim().toUpperCase(Locale.ROOT);
    }
}
