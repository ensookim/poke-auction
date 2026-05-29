import { AuctionResponse } from '@/services/auctionService';
import { tokenStorage } from '@/services/authService';

const RECENT_VIEWED_KEY = 'recentViewedAuctions';
const MAX_RECENT_ITEMS = 20;

export type RecentViewedAuction = Pick<
  AuctionResponse,
  'id' | 'cardName' | 'cardCategory' | 'imageUrl' | 'currentPrice' | 'endAt' | 'bidCount'
> & {
  viewedAt: string;
};

class RecentViewedService {
  async add(auction: AuctionResponse): Promise<void> {
    const items = await this.getAll();
    const next: RecentViewedAuction = {
      id: auction.id,
      cardName: auction.cardName,
      cardCategory: auction.cardCategory,
      imageUrl: auction.imageUrl,
      currentPrice: auction.currentPrice,
      endAt: auction.endAt,
      bidCount: auction.bidCount,
      viewedAt: new Date().toISOString(),
    };

    const deduped = items.filter((item) => item.id !== auction.id);
    await tokenStorage.setItem(
      RECENT_VIEWED_KEY,
      JSON.stringify([next, ...deduped].slice(0, MAX_RECENT_ITEMS)),
    );
  }

  async getAll(): Promise<RecentViewedAuction[]> {
    const stored = await tokenStorage.getItem(RECENT_VIEWED_KEY);
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as RecentViewedAuction[];
    } catch {
      await this.clear();
      return [];
    }
  }

  async clear(): Promise<void> {
    await tokenStorage.removeItem(RECENT_VIEWED_KEY);
  }
}

export default new RecentViewedService();
