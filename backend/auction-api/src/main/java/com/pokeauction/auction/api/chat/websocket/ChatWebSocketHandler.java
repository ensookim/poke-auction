package com.pokeauction.auction.api.chat.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.chat.dto.ChatMessageResponse;
import com.pokeauction.auction.api.chat.dto.ChatSocketEvent;
import com.pokeauction.auction.api.chat.dto.ChatSocketRequest;
import com.pokeauction.auction.api.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final JwtProvider jwtProvider;
    private final ChatService chatService;
    private final ObjectMapper objectMapper;

    private final Map<String, Long> sessionUsers = new ConcurrentHashMap<>();
    private final Map<String, Long> sessionRooms = new ConcurrentHashMap<>();
    private final Map<Long, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = extractToken(session.getUri());
        if (token == null || !jwtProvider.validateToken(token)) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid token"));
            return;
        }

        sessionUsers.put(session.getId(), jwtProvider.parseUserId(token));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        Long userId = sessionUsers.get(session.getId());
        if (userId == null) {
            sendToSession(session, ChatSocketEvent.error("인증이 필요합니다."));
            return;
        }

        try {
            ChatSocketRequest request = objectMapper.readValue(textMessage.getPayload(), ChatSocketRequest.class);
            if ("JOIN".equalsIgnoreCase(request.getType())) {
                joinRoom(session, userId, request.getRoomId());
                return;
            }

            if ("SEND".equalsIgnoreCase(request.getType())) {
                Long roomId = sessionRooms.getOrDefault(session.getId(), request.getRoomId());
                ChatMessageResponse message = chatService.sendMessage(roomId, userId, request.getContent());
                broadcast(roomId, ChatSocketEvent.message(message));
                return;
            }

            sendToSession(session, ChatSocketEvent.error("지원하지 않는 메시지 타입입니다."));
        } catch (Exception ex) {
            sendToSession(session, ChatSocketEvent.error(ex.getMessage()));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long roomId = sessionRooms.remove(session.getId());
        if (roomId != null) {
            Set<WebSocketSession> sessions = roomSessions.get(roomId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    roomSessions.remove(roomId);
                }
            }
        }
        sessionUsers.remove(session.getId());
    }

    private void joinRoom(WebSocketSession session, Long userId, Long roomId) throws IOException {
        if (roomId == null) {
            sendToSession(session, ChatSocketEvent.error("문의 정보를 찾을 수 없습니다."));
            return;
        }

        chatService.assertParticipant(roomId, userId);

        Long previousRoomId = sessionRooms.put(session.getId(), roomId);
        if (previousRoomId != null && !previousRoomId.equals(roomId)) {
            Set<WebSocketSession> previousSessions = roomSessions.get(previousRoomId);
            if (previousSessions != null) {
                previousSessions.remove(session);
            }
        }

        roomSessions.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
        sendToSession(session, ChatSocketEvent.joined(roomId));
    }

    private void broadcast(Long roomId, ChatSocketEvent event) throws IOException {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        String payload = objectMapper.writeValueAsString(event);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void sendToSession(WebSocketSession session, ChatSocketEvent event) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(event)));
        }
    }

    private String extractToken(URI uri) {
        if (uri == null) {
            return null;
        }

        return UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("token");
    }
}
