package com.pokeauction.auction.api.social.service;

import com.pokeauction.auction.api.social.domain.FollowRelation;
import com.pokeauction.auction.api.social.dto.FollowStatsResponse;
import com.pokeauction.auction.api.social.dto.FollowStatusResponse;
import com.pokeauction.auction.api.social.dto.FollowUserResponse;
import com.pokeauction.auction.api.social.repository.FollowRelationRepository;
import com.pokeauction.auction.api.user.domain.User;
import com.pokeauction.auction.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRelationRepository followRelationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public FollowStatsResponse getStats(Long userId) {
        return FollowStatsResponse.builder()
                .followingCount(followRelationRepository.countByFollowerId(userId))
                .followerCount(followRelationRepository.countByFollowingId(userId))
                .build();
    }

    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowing(Long userId) {
        return followRelationRepository.findByFollowerIdOrderByCreatedAtDesc(userId).stream()
                .map(FollowRelation::getFollowing)
                .map(FollowUserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FollowUserResponse> getFollowers(Long userId) {
        return followRelationRepository.findByFollowingIdOrderByCreatedAtDesc(userId).stream()
                .map(FollowRelation::getFollower)
                .map(FollowUserResponse::from)
                .toList();
    }

    @Transactional
    public FollowStatusResponse follow(Long me, Long targetUserId) {
        if (me.equals(targetUserId)) {
            throw new IllegalArgumentException("자기 자신은 팔로우할 수 없습니다.");
        }

        User follower = getUser(me);
        User following = getUser(targetUserId);

        followRelationRepository.findByFollowerIdAndFollowingId(me, targetUserId)
                .orElseGet(() -> followRelationRepository.save(
                        FollowRelation.builder()
                                .follower(follower)
                                .following(following)
                                .build()
                ));

        return FollowStatusResponse.builder()
                .userId(targetUserId)
                .following(true)
                .build();
    }

    @Transactional
    public FollowStatusResponse unfollow(Long me, Long targetUserId) {
        followRelationRepository.deleteByFollowerIdAndFollowingId(me, targetUserId);
        return FollowStatusResponse.builder()
                .userId(targetUserId)
                .following(false)
                .build();
    }

    @Transactional(readOnly = true)
    public FollowStatusResponse status(Long me, Long targetUserId) {
        return FollowStatusResponse.builder()
                .userId(targetUserId)
                .following(followRelationRepository.existsByFollowerIdAndFollowingId(me, targetUserId))
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));
    }
}
