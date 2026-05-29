package com.pokeauction.auction.api.payment.service;

import com.pokeauction.auction.api.auction.domain.Auction;
import com.pokeauction.auction.api.auction.repository.AuctionRepository;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.commerce.domain.CartItem;
import com.pokeauction.auction.api.commerce.repository.CartItemRepository;
import com.pokeauction.auction.api.payment.domain.PaymentOrder;
import com.pokeauction.auction.api.payment.domain.PaymentOrderStatus;
import com.pokeauction.auction.api.payment.dto.TossPaymentConfirmRequest;
import com.pokeauction.auction.api.payment.dto.TossPaymentConfirmResponse;
import com.pokeauction.auction.api.payment.dto.TossPaymentPrepareResponse;
import com.pokeauction.auction.api.payment.repository.PaymentOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TossPaymentService {

    private static final String TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

    private final PaymentOrderRepository paymentOrderRepository;
    private final AuctionRepository auctionRepository;
    private final AuctionService auctionService;
    private final CartItemRepository cartItemRepository;
    private final RestTemplate restTemplate;

    @Value("${toss.client-key:}")
    private String clientKey;

    @Value("${toss.secret-key:}")
    private String secretKey;

    @Value("${app.payment-success-url:cardbid://payment-success}")
    private String successUrl;

    @Value("${app.payment-fail-url:cardbid://payment-fail}")
    private String failUrl;

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    @Transactional
    public TossPaymentPrepareResponse prepareAuctionPayment(Long auctionId, Long userId, String requestBaseUrl) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new IllegalArgumentException("Auction not found."));

        boolean canPayAsWinner = auction.getWinnerId() != null && auction.getWinnerId().equals(userId);
        boolean canBuyNowWithPayment = auction.getWinnerId() == null && auction.isActive() && auction.hasBuyNow();
        if (!canPayAsWinner && !canBuyNowWithPayment) {
            throw new IllegalStateException("Only the winning buyer can pay for this auction.");
        }

        if (auction.isPaymentHeld()) {
            throw new IllegalStateException("Payment is already held.");
        }

        String orderId = "auction-" + auctionId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        String orderName = auction.getCardName() == null || auction.getCardName().isBlank()
                ? "CardBid auction #" + auctionId
                : auction.getCardName();

        PaymentOrder order = paymentOrderRepository.save(PaymentOrder.builder()
                .orderId(orderId)
                .userId(userId)
                .amount(canBuyNowWithPayment ? auction.getBuyNowPrice() : auction.getCurrentPrice())
                .orderName(orderName)
                .auctionIds(String.valueOf(auctionId))
                .status(PaymentOrderStatus.READY)
                .build());

        return TossPaymentPrepareResponse.builder()
                .clientKey(clientKey)
                .customerKey("user-" + userId)
                .orderId(order.getOrderId())
                .orderName(order.getOrderName())
                .amount(order.getAmount())
                .checkoutUrl(resolveBackendUrl(requestBaseUrl) + "/api/payments/toss/widget?orderId=" + order.getOrderId())
                .successUrl(successUrl)
                .failUrl(failUrl)
                .build();
    }

    @Transactional
    public TossPaymentPrepareResponse prepareCartPayment(Long userId, String requestBaseUrl) {
        List<CartItem> items = cartItemRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (items.isEmpty()) {
            throw new IllegalStateException("Cart is empty.");
        }

        for (CartItem item : items) {
            Auction auction = item.getAuction();
            if (!auction.isActive()) {
                throw new IllegalStateException("Ended auctions cannot be paid from the cart.");
            }
            if (!auction.hasBuyNow()) {
                throw new IllegalStateException("Only auctions with buy-now prices can be paid from the cart.");
            }
        }

        long total = items.stream()
                .map(CartItem::getAuction)
                .mapToLong(Auction::getBuyNowPrice)
                .sum();

        String auctionIds = String.join(
                ",",
                items.stream()
                        .map(CartItem::getAuction)
                        .map(Auction::getId)
                        .map(String::valueOf)
                        .toList()
        );
        String firstName = items.get(0).getAuction().getCardName();
        String orderName = items.size() == 1 ? firstName : firstName + " 외 " + (items.size() - 1) + "건";
        String orderId = "cart-" + userId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);

        PaymentOrder order = paymentOrderRepository.save(PaymentOrder.builder()
                .orderId(orderId)
                .userId(userId)
                .amount(total)
                .orderName(orderName)
                .auctionIds(auctionIds)
                .status(PaymentOrderStatus.READY)
                .build());

        return TossPaymentPrepareResponse.builder()
                .clientKey(clientKey)
                .customerKey("user-" + userId)
                .orderId(order.getOrderId())
                .orderName(order.getOrderName())
                .amount(order.getAmount())
                .checkoutUrl(resolveBackendUrl(requestBaseUrl) + "/api/payments/toss/widget?orderId=" + order.getOrderId())
                .successUrl(successUrl)
                .failUrl(failUrl)
                .build();
    }

    @Transactional
    public TossPaymentConfirmResponse confirm(Long userId, TossPaymentConfirmRequest request) {
        PaymentOrder order = paymentOrderRepository.findByOrderIdForUpdate(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Payment order not found."));

        if (!order.getUserId().equals(userId)) {
            throw new IllegalStateException("Payment order owner does not match.");
        }

        if (order.getStatus() == PaymentOrderStatus.DONE) {
            return TossPaymentConfirmResponse.builder()
                    .orderId(order.getOrderId())
                    .paymentKey(order.getPaymentKey())
                    .amount(order.getAmount())
                    .status(order.getStatus().name())
                    .build();
        }

        if (order.getStatus() == PaymentOrderStatus.FAILED) {
            throw new IllegalStateException("Payment order has already failed. Please create a new payment order.");
        }

        paymentOrderRepository.findByPaymentKey(request.getPaymentKey())
                .filter(existing -> !existing.getOrderId().equals(order.getOrderId()))
                .ifPresent(existing -> {
                    throw new IllegalStateException("Payment key is already used by another order.");
                });

        if (!order.getAmount().equals(request.getAmount())) {
            order.fail();
            throw new IllegalArgumentException("Payment amount does not match the original order.");
        }

        confirmWithToss(request);

        for (Long auctionId : parseAuctionIds(order.getAuctionIds())) {
            Auction auction = auctionRepository.findById(auctionId)
                    .orElseThrow(() -> new IllegalArgumentException("Auction not found."));
            if (auction.getWinnerId() == null && auction.isActive()) {
                auctionService.buyNowWithSafePayment(auctionId, userId, null, null, null);
            } else {
                auctionService.payAuction(auctionId, userId);
            }
            cartItemRepository.deleteByUserIdAndAuctionId(userId, auctionId);
        }

        order.complete(request.getPaymentKey());
        return TossPaymentConfirmResponse.builder()
                .orderId(order.getOrderId())
                .paymentKey(order.getPaymentKey())
                .amount(order.getAmount())
                .status(order.getStatus().name())
                .build();
    }

    @Transactional(readOnly = true)
    public PaymentOrder getOrder(String orderId) {
        return paymentOrderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment order not found."));
    }

    public String renderWidgetPage(String orderId) {
        PaymentOrder order = getOrder(orderId);
        return """
                <!doctype html>
                <html lang="ko">
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <title>CardBid 안전결제</title>
                  <script src="https://js.tosspayments.com/v2/standard"></script>
                  <style>
                    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #111827; }
                    main { max-width: 520px; margin: 0 auto; padding: 24px 16px 40px; }
                    h1 { font-size: 22px; margin: 0 0 6px; }
                    p { margin: 0 0 18px; color: #64748b; line-height: 1.5; }
                    #payment-method, #agreement { background: #fff; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
                    button { width: 100%%; height: 52px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-size: 16px; font-weight: 800; }
                  </style>
                </head>
                <body>
                  <main>
                    <h1>안전결제</h1>
                    <p>%s · %s원</p>
                    <div id="payment-method"></div>
                    <div id="agreement"></div>
                    <button id="pay-button">결제하기</button>
                  </main>
                  <script>
                    const tossPayments = TossPayments("%s");
                    const widgets = tossPayments.widgets({ customerKey: "%s" });
                    async function main() {
                      await widgets.setAmount({ currency: "KRW", value: %d });
                      await widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" });
                      await widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" });
                      document.getElementById("pay-button").addEventListener("click", async () => {
                        await widgets.requestPayment({
                          orderId: "%s",
                          orderName: "%s",
                          successUrl: "%s",
                          failUrl: "%s"
                        });
                      });
                    }
                    main().catch((error) => alert(error.message || String(error)));
                  </script>
                </body>
                </html>
                """.formatted(
                escapeHtml(order.getOrderName()),
                order.getAmount(),
                clientKey,
                "user-" + order.getUserId(),
                order.getAmount(),
                order.getOrderId(),
                escapeJs(order.getOrderName()),
                successUrl,
                failUrl
        );
    }

    private void confirmWithToss(TossPaymentConfirmRequest request) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("Toss Payments secret key is not configured.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8)));

        Map<String, Object> body = Map.of(
                "paymentKey", request.getPaymentKey(),
                "orderId", request.getOrderId(),
                "amount", request.getAmount()
        );

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                    TOSS_CONFIRM_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException("Toss payment confirmation failed: " + ex.getResponseBodyAsString(), ex);
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Toss payment confirmation failed.");
        }
    }

    private List<Long> parseAuctionIds(String auctionIds) {
        return List.of(auctionIds.split(",")).stream()
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .toList();
    }

    private String resolveBackendUrl(String requestBaseUrl) {
        String baseUrl = requestBaseUrl == null || requestBaseUrl.isBlank() ? backendUrl : requestBaseUrl;
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String escapeJs(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
