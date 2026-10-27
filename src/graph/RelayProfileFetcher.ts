import type { RelayPool } from "applesauce-relay";
import type { NostrProfile } from "@/types";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import { firstValueFrom, timeout } from 'rxjs';

export interface ProfileFetcher {
  fetchProfiles(pubkeys: string[]): Promise<Map<string, NostrProfile>>;
}

export class RelayProfileFetcher implements ProfileFetcher {
  private readonly timeoutMs = 10000;
  private readonly profileFetchConcurrency = 12;

  constructor(
    private readonly pool: RelayPool,
    private readonly nostrRelays: string[],
  ) {}

  async fetchProfiles(pubkeys: string[]): Promise<Map<string, NostrProfile>> {
    if (pubkeys.length === 0) {
      return new Map();
    }

    const profiles = await mapWithConcurrency(
      pubkeys,
      this.profileFetchConcurrency,
      async (pubkey) => await this.fetchProfile(pubkey),
    );

    return new Map(profiles.map((profile) => [profile.pubkey, profile]));
  }

  private async fetchProfile(pubkey: string): Promise<NostrProfile> {
    try {
      const event = await firstValueFrom(
        this.pool
          .request(this.nostrRelays, {
            kinds: [0],
            authors: [pubkey],
            limit: 1,
          })
          .pipe(timeout({ first: this.timeoutMs })),
        { defaultValue: null },
      );

      if (!event || !event.content) {
        return { pubkey };
      }

      try {
        const profile = JSON.parse(event.content) as Partial<NostrProfile>;
        return {
          pubkey,
          name: profile.name,
          display_name: profile.display_name,
          picture: profile.picture,
          nip05: profile.nip05,
          lud16: profile.lud16,
          about: profile.about,
        };
      } catch {
        return { pubkey };
      }
    } catch {
      return { pubkey };
    }
  }
}
