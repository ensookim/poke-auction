package com.pokeauction.auction.api.commerce.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.commerce.domain.CartItem;
import com.pokeauction.auction.api.commerce.domain.WishlistItem;
import com.pokeauction.auction.api.commerce.dto.CheckoutResponse;
import com.pokeauction.auction.api.commerce.dto.CollectionItemResponse;
import com.pokeauction.auction.api.commerce.dto.CollectionStatusResponse;
import com.pokeauction.auction.api.commerce.repository.CartItemRepository;
import com.pokeauction.auction.api.commerce.repository.WishlistItemRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommerceService {

    private final WishlistItemRepository wishlistItemRepository;
    private final CartItemRepository cartItemRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final AuctionService auctionService;

    @Transactional(readOnly = true)
    public List<CollectionItemResponse> getWishlist(Long userId) {
        return wishlistItemRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CollectionItemResponse::from)
                .toList();
    }

    @Transactional
    public CollectionStatusResponse addWishlist(Long userId, Long auctionId) {
        User user = getUser(userId);
        Auction auction = getAuction(auctionId);

        wishlistItemRepository.findByUserIdAndAuctionId(userId, auctionId)
                .orElseGet(() -> wishlistItemRepository.save(WishlistItem.builder()
                        .user(user)
                        .auction(auction)
                        .build()));

        return getStatus(userId, auctionId);
    }

    @Transactional
    public CollectionStatusResponse removeWishlist(Long userId, Long auctionId) {
        wishlistItemRepository.deleteByUserIdAndAuctionId(userId, auctionId);
        return getStatus(userId, auctionId);
    }

    @Transactional(readOnly = true)
    public List<CollectionItemResponse> getCart(Long userId) {
        return cartItemRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CollectionItemResponse::from)
                .toList();
    }

    @Transactional
    public CollectionStatusResponse addCart(Long userId, Long auctionId) {
        User user = getUser(userId);
        Auction auction = getAuction(auctionId);
        validateCartable(auction);

        cartItemRepository.findByUserIdAndAuctionId(userId, auctionId)
                .orElseGet(() -> cartItemRepository.save(CartItem.builder()
                        .user(user)
                        .auction(auction)
                        .build()));

        return getStatus(userId, auctionId);
    }

    @Transactional
    public CollectionStatusResponse removeCart(Long userId, Long auctionId) {
        cartItemRepository.deleteByUserIdAndAuctionId(userId, auctionId);
        return getStatus(userId, auctionId);
    }

    @Transactional(readOnly = true)
    public CollectionStatusResponse getStatus(Long userId, Long auctionId) {
        return CollectionStatusResponse.builder()
                .auctionId(auctionId)
                .wished(wishlistItemRepository.existsByUserIdAndAuctionId(userId, auctionId))
                .inCart(cartItemRepository.existsByUserIdAndAuctionId(userId, auctionId))
                .build();
    }

    @Transactional
    public CheckoutResponse checkoutCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (items.isEmpty()) {
            throw new IllegalStateException("장바구니가 비어 있습니다.");
        }

        items.forEach(item -> validateCartable(item.getAuction()));

        long total = items.stream()
                .map(CartItem::getAuction)
                .mapToLong(Auction::getBuyNowPrice)
                .sum();

        List<Long> auctionIds = items.stream()
                .map(CartItem::getAuction)
                .map(Auction::getId)
                .toList();

        for (Long auctionId : auctionIds) {
            auctionService.buyNowWithSafePayment(auctionId, userId, null, null, null);
        }

        cartItemRepository.deleteAll(items);

        return CheckoutResponse.builder()
                .itemCount(items.size())
                .totalAmount(total)
                .items(items.stream().map(CollectionItemResponse::from).toList())
                .paymentStatus("HELD")
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));
    }

    private Auction getAuction(Long auctionId) {
        return auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("해당 경매를 찾을 수 없습니다."));
    }

    private void validateCartable(Auction auction) {
        if (!auction.isActive()) {
            throw new IllegalStateException("종료된 경매는 장바구니에 담을 수 없습니다.");
        }

        if (!auction.hasBuyNow()) {
            throw new IllegalStateException("즉시 낙찰가가 있는 상품만 장바구니 결제가 가능합니다.");
        }
    }
}
