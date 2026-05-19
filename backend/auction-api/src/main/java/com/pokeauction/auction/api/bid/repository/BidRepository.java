package com.pokeauction.auction.api.bid.repository;

import com.pokeauction.auction.api.bid.domain.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {

	@Query("SELECT b FROM Bid b WHERE b.bidder.id = :bidderId")
	List<Bid> findByBidderId(@Param("bidderId") Long bidderId);

	@Query("SELECT b FROM Bid b WHERE b.auction.id = :auctionId ORDER BY b.amount DESC")
	List<Bid> findByAuctionIdOrderByAmountDesc(@Param("auctionId") Long auctionId);
}
