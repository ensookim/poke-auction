package com.pokeauction.auction.api.safety.repository;

import com.pokeauction.auction.api.safety.domain.UserBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    boolean existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(
            Long blockerId1,
            Long blockedId1,
            Long blockerId2,
            Long blockedId2
    );

    Optional<UserBlock> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);
}
