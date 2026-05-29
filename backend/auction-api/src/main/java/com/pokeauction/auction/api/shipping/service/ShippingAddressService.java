package com.pokeauction.auction.api.shipping.service;

import com.pokeauction.auction.api.shipping.domain.ShippingAddress;
import com.pokeauction.auction.api.shipping.dto.ShippingAddressRequest;
import com.pokeauction.auction.api.shipping.dto.ShippingAddressResponse;
import com.pokeauction.auction.api.shipping.repository.ShippingAddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShippingAddressService {

    private final ShippingAddressRepository shippingAddressRepository;

    @Transactional(readOnly = true)
    public ShippingAddressResponse get(Long userId) {
        return shippingAddressRepository.findByUserId(userId)
                .map(ShippingAddressResponse::from)
                .orElse(null);
    }

    @Transactional
    public ShippingAddressResponse save(Long userId, ShippingAddressRequest request) {
        ShippingAddress address = shippingAddressRepository.findByUserId(userId)
                .orElseGet(() -> ShippingAddress.builder()
                        .userId(userId)
                        .recipientName(request.getRecipientName().trim())
                        .phoneNumber(request.getPhoneNumber().trim())
                        .address(request.getAddress().trim())
                        .addressDetail(normalize(request.getAddressDetail()))
                        .deliveryMemo(normalize(request.getDeliveryMemo()))
                        .build());

        address.update(
                request.getRecipientName().trim(),
                request.getPhoneNumber().trim(),
                request.getAddress().trim(),
                normalize(request.getAddressDetail()),
                normalize(request.getDeliveryMemo())
        );

        return ShippingAddressResponse.from(shippingAddressRepository.save(address));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
