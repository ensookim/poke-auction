package com.pokeauction.auction.api.notification.repository;

import com.pokeauction.auction.api.notification.domain.UserPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

    Optional<UserPushToken> findByToken(String token);

    List<UserPushToken> findByUserId(Long userId);
}
