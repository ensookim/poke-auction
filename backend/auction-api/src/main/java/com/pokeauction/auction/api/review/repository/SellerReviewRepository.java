package com.pokeauction.auction.api.review.repository;

import com.pokeauction.auction.api.review.domain.SellerReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SellerReviewRepository extends JpaRepository<SellerReview, Long> {

    List<SellerReview> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    Optional<SellerReview> findByAuctionIdAndReviewerId(Long auctionId, Long reviewerId);

    long countBySellerId(Long sellerId);
}
