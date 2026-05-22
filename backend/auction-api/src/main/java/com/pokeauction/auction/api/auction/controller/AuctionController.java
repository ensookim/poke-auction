package com.pokeauction.auction.api.auction.controller;

import com.pokeauction.auction.api.auction.dto.AuctionResponse;
import com.pokeauction.auction.api.auction.dto.CreateAuctionRequest;
import com.pokeauction.auction.api.auction.dto.ShippingInfoRequest;
import com.pokeauction.auction.api.auction.service.AuctionService;
import com.pokeauction.auction.api.auth.service.JwtProvider;
import com.pokeauction.auction.api.bid.dto.PlaceBidRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public List<AuctionResponse> listAuctions(
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "hot") String sort,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly
    ) {
        return auctionService.listAuctions(category, sort, activeOnly);
    }

    @PostMapping
    public AuctionResponse createAuction(
            @RequestBody @Valid CreateAuctionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        return auctionService.createAuction(request, userId);
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadImage(
            @RequestPart("file") MultipartFile file,
            HttpServletRequest servletRequest
    ) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일이 비어 있습니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다.");
        }

        try {
            Path uploadDir = Path.of("uploads").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            String extension = resolveExtension(file.getOriginalFilename(), contentType);
            String filename = UUID.randomUUID() + extension;
            Path target = uploadDir.resolve(filename).normalize();
            file.transferTo(target);

            String baseUrl = servletRequest.getRequestURL()
                    .toString()
                    .replace(servletRequest.getRequestURI(), "");
            return Map.of("imageUrl", baseUrl + "/uploads/" + filename);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 저장에 실패했습니다.", ex);
        }
    }

    @PostMapping("/{id}/bid")
    public AuctionResponse placeBid(
            @PathVariable Long id,
            @RequestBody @Valid PlaceBidRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        Long userId = resolveUserId(authorization);
        try {
            String ip = servletRequest.getRemoteAddr();
            String device = servletRequest.getHeader("X-Device-Id");
            String ua = servletRequest.getHeader("User-Agent");

            return auctionService.placeBid(id, userId, request.getAmount(), ip, device, ua);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @PostMapping("/{id}/buy-now")
    public AuctionResponse buyNow(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest servletRequest
    ) {
        Long userId = resolveUserId(authorization);
        try {
            String ip = servletRequest.getRemoteAddr();
            String device = servletRequest.getHeader("X-Device-Id");
            String ua = servletRequest.getHeader("User-Agent");

            return auctionService.buyNow(id, userId, ip, device, ua);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/{id}")
    public AuctionResponse getAuction(@PathVariable Long id) {
        return auctionService.getAuctionDetails(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAuction(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        auctionService.deleteAuction(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/shipping-info")
    public AuctionResponse submitShippingInfo(
            @PathVariable Long id,
            @RequestBody @Valid ShippingInfoRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = resolveUserId(authorization);
        try {
            return auctionService.submitShippingInfo(id, userId, request);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/my-bids")
    public List<AuctionResponse> myBids(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        return auctionService.getAuctionsByBidder(userId);
    }

    @GetMapping("/my-listings")
    public List<AuctionResponse> myListings(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        return auctionService.getAuctionsByCreator(userId);
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
