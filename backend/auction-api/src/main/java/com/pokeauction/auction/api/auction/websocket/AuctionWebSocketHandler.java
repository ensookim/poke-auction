package com.pokeauction.auction.api.auction.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.AuctionSocketEvent;
import com.pokeauction.auction.api.auction.dto.AuctionSocketRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class AuctionWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<String, Long> sessionAuctions = new ConcurrentHashMap<>();
    private final Map<Long, Set<WebSocketSession>> auctionSessions = new ConcurrentHashMap<>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        try {
            AuctionSocketRequest request = objectMapper.readValue(textMessage.getPayload(), AuctionSocketRequest.class);
            if ("JOIN".equalsIgnoreCase(request.getType())) {
                joinAuction(session, request.getAuctionId());
                return;
            }

            sendToSession(session, AuctionSocketEvent.error("지원하지 않는 메시지 타입입니다."));
        } catch (Exception ex) {
            sendToSession(session, AuctionSocketEvent.error(ex.getMessage()));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
    }

    public void broadcastUpdate(Long auctionId, AuctionResponse auction) {
        Set<WebSocketSession> sessions = auctionSessions.get(auctionId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(AuctionSocketEvent.updated(auctionId, auction));
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(payload));
                }
            }
        } catch (IOException ignored) {
            // Live updates are best-effort; the auction write itself must not fail because of a socket issue.
        }
    }

    private void joinAuction(WebSocketSession session, Long auctionId) throws IOException {
        if (auctionId == null) {
            sendToSession(session, AuctionSocketEvent.error("경매 정보를 찾을 수 없습니다."));
            return;
        }

        removeSession(session);
        sessionAuctions.put(session.getId(), auctionId);
        auctionSessions.computeIfAbsent(auctionId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
        sendToSession(session, AuctionSocketEvent.joined(auctionId));
    }

    private void removeSession(WebSocketSession session) {
        Long auctionId = sessionAuctions.remove(session.getId());
        if (auctionId == null) {
            return;
        }

        Set<WebSocketSession> sessions = auctionSessions.get(auctionId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            auctionSessions.remove(auctionId);
        }
    }

    private void sendToSession(WebSocketSession session, AuctionSocketEvent event) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(event)));
        }
    }
}
