package com.pokeauction.auction.api.auction.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.dto.ShippingInfoRequest;
import com.pokeauction.auction.api.auction.dto.TrackingInfoRequest;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.auction.websocket.AuctionWebSocketHandler;
import com.pokeauction.auction.api.bid.domain.Bid;
import com.pokeauction.auction.api.bid.repository.BidRepository;
import com.pokeauction.auction.api.chat.domain.ChatMessage;
import com.pokeauction.auction.api.chat.domain.ChatRoom;
import com.pokeauction.auction.api.chat.repository.ChatMessageRepository;
import com.pokeauction.auction.api.chat.repository.ChatRoomRepository;
import com.pokeauction.auction.api.commerce.repository.WishlistItemRepository;
import com.pokeauction.auction.api.notification.service.PushNotificationService;
import com.pokeauction.auction.api.safety.repository.UserBlockRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
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
    private final AuctionWebSocketHandler auctionWebSocketHandler;
    private final PushNotificationService pushNotificationService;

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

        return toResponse(auctionRepository.save(auction));
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

        Long previousWinnerId = auction.getWinnerId();
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
        AuctionResponse response = toResponse(saved);
        auctionWebSocketHandler.broadcastUpdate(saved.getId(), response);
        notifyOutbid(previousWinnerId, bidderId, saved);
        notifySellerNewBid(saved, amount);
        return response;
    }

    @Transactional
    public AuctionResponse buyNow(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent) {
        Auction saved = buyNowInternal(auctionId, buyerId, ipAddress, deviceId, userAgent, false);
        AuctionResponse response = toResponse(saved);
        auctionWebSocketHandler.broadcastUpdate(saved.getId(), response);
        return response;
    }

    @Transactional
    public AuctionResponse buyNowWithSafePayment(Long auctionId, Long buyerId, String ipAddress, String deviceId, String userAgent) {
        Auction saved = buyNowInternal(auctionId, buyerId, ipAddress, deviceId, userAgent, true);
        AuctionResponse response = toResponse(saved);
        auctionWebSocketHandler.broadcastUpdate(saved.getId(), response);
        notifySellerPaymentHeld(saved);
        return response;
    }

    @Transactional
    public AuctionResponse payAuction(Long auctionId, Long buyerId) {
        Auction auction = auctionRepository.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));

        if (auction.getWinnerId() == null || !auction.getWinnerId().equals(buyerId)) {
            throw new IllegalStateException("낙찰자만 결제할 수 있습니다.");
        }

        auction.markPaymentPending();
        auction.holdPayment();
        Auction saved = auctionRepository.save(auction);
        AuctionResponse response = toResponse(saved);
        auctionWebSocketHandler.broadcastUpdate(saved.getId(), response);
        notifySellerPaymentHeld(saved);
        return response;
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
            throw new IllegalArgumentException("자신의 경매에는 즉시 낙찰할 수 없습니다.");
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
            throw new IllegalStateException("안전결제 후 배송 정보를 입력할 수 있습니다.");
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
            throw new IllegalStateException("안전결제 후 송장 정보를 입력할 수 있습니다.");
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
        pushNotificationService.sendAuctionNotification(
                auction.getWinnerId(),
                "SHIPPING",
                "송장번호가 등록됐어요",
                saved.getCardName() + " 배송 정보를 확인해주세요.",
                saved.getId()
        );

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
            throw new IllegalStateException("안전결제 후 수령 확인을 할 수 있습니다.");
        }

        auction.confirmReceived();
        Auction saved = auctionRepository.save(auction);
        pushNotificationService.sendAuctionNotification(
                saved.getCreatedBy() == null ? null : saved.getCreatedBy().getId(),
                "RECEIVED",
                "구매확정 완료",
                saved.getCardName() + " 구매자가 상품 수령을 확인했어요.",
                saved.getId()
        );
        return toResponse(saved);
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

        for (Auction auction : ended) {
            auction.finalizeWinner();
            Auction saved = auctionRepository.save(auction);
            if (saved.getWinnerId() != null) {
                pushNotificationService.sendAuctionNotification(
                        saved.getWinnerId(),
                        "WIN",
                        "경매에 낙찰됐어요",
                        saved.getCardName() + " 결제를 진행해주세요.",
                        saved.getId()
                );
            }
        }
    }

    private AuctionResponse toResponse(Auction auction) {
        long wishlistCount = auction.getId() == null ? 0L : wishlistItemRepository.countByAuctionId(auction.getId());
        return AuctionResponse.from(auction, wishlistCount);
    }

    private void notifyOutbid(Long previousWinnerId, Long newBidderId, Auction auction) {
        if (previousWinnerId == null || previousWinnerId.equals(newBidderId)) {
            return;
        }
        pushNotificationService.sendAuctionNotification(
                previousWinnerId,
                "BID_OUTBID",
                "상위 입찰이 들어왔어요",
                auction.getCardName() + " 현재가가 갱신됐어요.",
                auction.getId()
        );
    }

    private void notifySellerNewBid(Auction auction, Long amount) {
        if (auction.getCreatedBy() == null) {
            return;
        }
        pushNotificationService.sendAuctionNotification(
                auction.getCreatedBy().getId(),
                "BID",
                "새 입찰이 들어왔어요",
                auction.getCardName() + " 입찰가가 " + amount + "원으로 올라갔어요.",
                auction.getId()
        );
    }

    private void notifySellerPaymentHeld(Auction auction) {
        if (auction.getCreatedBy() == null) {
            return;
        }
        pushNotificationService.sendAuctionNotification(
                auction.getCreatedBy().getId(),
                "PAYMENT",
                "안전결제가 완료됐어요",
                auction.getCardName() + " 결제금이 보관 중입니다. 배송을 준비해주세요.",
                auction.getId()
        );
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
