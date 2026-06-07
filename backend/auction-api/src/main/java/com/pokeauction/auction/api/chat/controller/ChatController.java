package com.pokeauction.auction.api.chat.controller;

import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.chat.dto.ChatMessageResponse;
import com.pokeauction.auction.api.chat.dto.ChatRoomResponse;
import com.pokeauction.auction.api.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final JwtProvider jwtProvider;

    @PostMapping("/auctions/{auctionId}/rooms")
    public ChatRoomResponse createRoom(
            @PathVariable Long auctionId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        try {
            return chatService.createOrGetRoom(auctionId, userId);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/rooms")
    public List<ChatRoomResponse> getMyRooms(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        return chatService.getMyRooms(userId);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageResponse> getMessages(
            @PathVariable Long roomId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        try {
            return chatService.getMessages(roomId, userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage(), ex);
        }
    }

    @PostMapping("/rooms/{roomId}/read")
    public void markRead(
            @PathVariable Long roomId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        try {
            chatService.markRead(roomId, userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage(), ex);
        }
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadImage(
            @RequestPart("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        resolveUserId(authorization);
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일이 비어 있습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다.");
        }

        try {
            Path uploadDir = Path.of("uploads", "chats").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            String extension = resolveExtension(file.getOriginalFilename(), contentType);
            String filename = UUID.randomUUID() + extension;
            Path target = uploadDir.resolve(filename).normalize();
            file.transferTo(target);

            String baseUrl = servletRequest.getRequestURL()
                    .toString()
                    .replace(servletRequest.getRequestURI(), "");
            return Map.of("imageUrl", baseUrl + "/uploads/chats/" + filename);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 저장에 실패했습니다.", ex);
        }
    }

    private Long resolveUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        String token = authorization.substring(7);
        if (!jwtProvider.validateToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }

        return jwtProvider.parseUserId(token);
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null) {
            String lower = originalFilename.toLowerCase();
            if (lower.endsWith(".png")) {
                return ".png";
            }
            if (lower.endsWith(".webp")) {
                return ".webp";
            }
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                return ".jpg";
            }
        }

        if ("image/png".equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        return ".jpg";
    }
}
