package com.pokeauction.auction.api.social.repository;

import com.pokeauction.auction.api.social.domain.FollowRelation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FollowRelationRepository extends JpaRepository<FollowRelation, Long> {

    Optional<FollowRelation> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    List<FollowRelation> findByFollowerIdOrderByCreatedAtDesc(Long followerId);

    List<FollowRelation> findByFollowingIdOrderByCreatedAtDesc(Long followingId);

    long countByFollowerId(Long followerId);

    long countByFollowingId(Long followingId);
}
