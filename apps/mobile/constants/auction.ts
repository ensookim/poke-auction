import { AuctionResponse } from '@/services/auctionService';

export type AuctionCategoryKey =
  | 'ALL'
  | 'POKEMON'
  | 'YUGIOH'
  | 'ONE_PIECE'
  | 'SPORTS'
  | 'DIGIMON'
  | 'ETC';

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
    icon: 'grid-outline',
  },
  {
    key: 'POKEMON',
    label: '포켓몬',
    subtitle: '포켓몬 카드/프로모',
    tint: '#0F766E',
    background: '#E7F7F3',
    icon: 'diamond-outline',
  },
  {
    key: 'YUGIOH',
    label: '유희왕',
    subtitle: 'OCG/TCG/레어 카드',
    tint: '#A16207',
    background: '#FFF4D6',
    icon: 'sparkles-outline',
  },
  {
    key: 'ONE_PIECE',
    label: '원피스',
    subtitle: 'OPCG/프로모/한정판',
    tint: '#6D28D9',
    background: '#F0E7FF',
    icon: 'flag-outline',
  },
  {
    key: 'SPORTS',
    label: '스포츠',
    subtitle: '야구/축구/농구 카드',
    tint: '#BE123C',
    background: '#FFE5EC',
    icon: 'trophy-outline',
  },
  {
    key: 'DIGIMON',
    label: '디지몬',
    subtitle: '디지몬 카드게임',
    tint: '#EA580C',
    background: '#FFEDD5',
    icon: 'hardware-chip-outline',
  },
  {
    key: 'ETC',
    label: '기타',
    subtitle: '그 외 수집 카드',
    tint: '#475569',
    background: '#E2E8F0',
    icon: 'albums-outline',
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
  { icon: 'chatbubble-ellipses-outline', label: '1:1 문의' },
  { icon: 'time', label: '마감 알림' },
] as const;

export const PRODUCT_TYPE_OPTIONS = ['단일 카드', '감정 카드', '팩/박스'] as const;

export const RAW_CONDITION_OPTIONS = ['최상', '상', '중', '하'] as const;

export const LANGUAGE_OPTIONS = ['한국어', '일본어', '영어', '기타'] as const;

export const EDITION_OPTIONS = [
  '일반판',
  '한정판',
  '프로모',
  '시크릿/레어',
  '사인/넘버드',
] as const;

export const GRADING_COMPANIES = [
  '미감정',
  'PSA',
  'BGS',
  'CGC',
  'ARS',
  '기타',
] as const;

export const GRADE_SCORES = [
  '10',
  '9.5',
  '9',
  '8.5',
  '8',
  '7.5',
  '7',
  '기타',
] as const;

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
