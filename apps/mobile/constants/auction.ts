import { AuctionResponse } from '@/services/auctionService';

export type AuctionCategoryKey = 'ALL' | 'SINGLE' | 'SEALED' | 'GRADED' | 'PROMO';

export const AUCTION_CATEGORIES: {
  key: AuctionCategoryKey;
  label: string;
  subtitle: string;
  tint: string;
  background: string;
  icon: string;
}[] = [
  {
    key: 'ALL',
    label: '전체',
    subtitle: '진행중인 경매',
    tint: '#111827',
    background: '#F2F4F7',
    icon: 'grid',
  },
  {
    key: 'SINGLE',
    label: '트레이딩',
    subtitle: 'TCG/스포츠/수집',
    tint: '#0F766E',
    background: '#E7F7F3',
    icon: 'albums',
  },
  {
    key: 'SEALED',
    label: '미개봉',
    subtitle: '팩/박스/세트',
    tint: '#A16207',
    background: '#FFF4D6',
    icon: 'cube',
  },
  {
    key: 'GRADED',
    label: '그레이딩',
    subtitle: 'PSA/BGS/CGC 인증',
    tint: '#6D28D9',
    background: '#F0E7FF',
    icon: 'ribbon',
  },
  {
    key: 'PROMO',
    label: '한정판',
    subtitle: '프로모/이벤트',
    tint: '#BE123C',
    background: '#FFE5EC',
    icon: 'sparkles',
  },
];

export const SORT_OPTIONS = [
  { key: 'hot', label: '인기순' },
  { key: 'ending', label: '마감임박' },
  { key: 'new', label: '최신순' },
  { key: 'cheap', label: '낮은 가격' },
] as const;

export const TRUST_BADGES = [
  { icon: 'shield-checkmark', label: '안전거래' },
  { icon: 'chatbubbles', label: '1:1 문의' },
  { icon: 'time', label: '마감 알림' },
] as const;

export const CONDITION_OPTIONS = ['미개봉', '민트', '상급', '플레이용'] as const;

export const LANGUAGE_OPTIONS = ['한국어', '일본어', '영어', '기타'] as const;

export type AuctionSortKey = (typeof SORT_OPTIONS)[number]['key'];

export const formatPrice = (price?: number | null) =>
  typeof price === 'number' ? `${price.toLocaleString()}원` : '-';

export const formatRemainingTime = (endAt?: string): string => {
  if (!endAt) {
    return '시간 미정';
  }

  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) {
    return '종료됨';
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) {
    return `${days}일 ${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
};

export const getCategoryMeta = (category?: string | null) =>
  AUCTION_CATEGORIES.find((item) => item.key === category) ??
  AUCTION_CATEGORIES[1];

export const sortAuctions = (
  auctions: AuctionResponse[],
  sort: AuctionSortKey,
) => {
  const items = [...auctions];

  if (sort === 'ending') {
    return items.sort(
      (a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime(),
    );
  }

  if (sort === 'new') {
    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  if (sort === 'cheap') {
    return items.sort((a, b) => a.currentPrice - b.currentPrice);
  }

  return items.sort((a, b) => b.bidCount - a.bidCount);
};
