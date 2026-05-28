package com.pokeauction.auction.api.review.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.review.domain.SellerReview;
import com.pokeauction.auction.api.review.dto.SellerReviewRequest;
import com.pokeauction.auction.api.review.dto.SellerReviewResponse;
import com.pokeauction.auction.api.review.dto.SellerReviewSummaryResponse;
import com.pokeauction.auction.api.review.repository.SellerReviewRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SellerReviewService {

    private final SellerReviewRepository sellerReviewRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SellerReviewResponse> getReviews(Long sellerId) {
        return sellerReviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId).stream()
                .map(SellerReviewResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SellerReviewSummaryResponse getSummary(Long sellerId) {
        List<SellerReview> reviews = sellerReviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId);
        double average = reviews.stream()
                .mapToInt(SellerReview::getRating)
                .average()
                .orElse(0.0);

        return SellerReviewSummaryResponse.builder()
                .sellerId(sellerId)
                .averageRating(Math.round(average * 10.0) / 10.0)
                .reviewCount(reviews.size())
                .build();
    }

    @Transactional
    public SellerReviewResponse createOrUpdateReview(Long sellerId, Long reviewerId, SellerReviewRequest request) {
        Auction auction = auctionRepository.findById(request.getAuctionId())
                .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

        if (auction.getCreatedBy() == null || !auction.getCreatedBy().getId().equals(sellerId)) {
            throw new IllegalArgumentException("이 판매자의 거래에만 후기를 남길 수 있습니다.");
        }

        if (sellerId.equals(reviewerId)) {
            throw new IllegalArgumentException("본인 상점에는 후기를 남길 수 없습니다.");
        }

        if (auction.getWinnerId() == null || !auction.getWinnerId().equals(reviewerId)) {
            throw new IllegalStateException("낙찰자만 거래 후기를 남길 수 있습니다.");
        }

        if (auction.isActive()) {
            throw new IllegalStateException("경매 종료 후 후기를 남길 수 있습니다.");
        }

        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new IllegalArgumentException("판매자를 찾을 수 없습니다."));
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new IllegalArgumentException("후기 작성자를 찾을 수 없습니다."));

        String content = request.getContent() == null ? "" : request.getContent().trim();
        SellerReview review = sellerReviewRepository.findByAuctionIdAndReviewerId(auction.getId(), reviewerId)
                .orElseGet(() -> SellerReview.builder()
                        .seller(seller)
                        .reviewer(reviewer)
                        .auction(auction)
                        .build());

        review.update(request.getRating(), content);
        return SellerReviewResponse.from(sellerReviewRepository.save(review));
    }
}
