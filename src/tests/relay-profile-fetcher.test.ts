import { afterEach, describe, expect, jest, test } from 'bun:test';
import { setImmediate } from 'node:timers/promises';
import type { RelayPool } from 'applesauce-relay';
import { Observable, type Subscriber } from 'rxjs';
import type { NostrEvent } from 'nostr-social-duck';
import { RelayProfileFetcher } from '@/graph/RelayProfileFetcher';

const pubkey = 'a'.repeat(64);
const profile = {
  name: 'Alice',
  display_name: 'Alice Example',
  picture: 'https://example.com/alice.png',
  nip05: 'alice@example.com',
  lud16: 'alice@example.com',
  about: 'Profile fixture',
};
const event: NostrEvent = {
  id: 'b'.repeat(64),
  pubkey,
  created_at: 1700000000,
  kind: 0,
  tags: [],
  content: JSON.stringify(profile),
  sig: 'c'.repeat(128),
};

function setup(start?: (subscriber: Subscriber<NostrEvent>) => void) {
  jest.useFakeTimers();
  const teardown = jest.fn();
  let subscriber!: Subscriber<NostrEvent>;
  const events = new Observable<NostrEvent>((sink) => {
    subscriber = sink;
    start?.(sink);
    return teardown;
  });
  const pool = { request: () => events } as unknown as RelayPool;
  const fetcher = new RelayProfileFetcher(pool, ['wss://relay.example']);
  const resolved = jest.fn();
  const result = fetcher.fetchProfiles([pubkey]);
  void result.then(resolved);
  return { subscriber, teardown, resolved, result };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('RelayProfileFetcher', () => {
  test('returns the pubkey immediately when a query completes without an event', async () => {
    const { subscriber, teardown, resolved } = setup();
    subscriber.complete();
    await setImmediate();

    expect(resolved).toHaveBeenCalledWith(new Map([[pubkey, { pubkey }]]));
    expect(subscriber.closed).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  for (const synchronous of [false, true]) {
    const outcomes = synchronous
      ? (['complete', 'event', 'error'] as const)
      : (['event', 'error'] as const);
    for (const outcome of outcomes) {
      // Asynchronous completion is covered by the explicit regression above.
      test(`${synchronous ? 'synchronous' : 'asynchronous'} ${outcome} settles and releases resources`, async () => {
        const emit = (sink: Subscriber<NostrEvent>) => {
          if (outcome === 'event') sink.next(event);
          else if (outcome === 'error') sink.error(new Error('Relay failed'));
          else sink.complete();
        };
        const { subscriber, teardown, resolved, result } = setup(
          synchronous ? emit : undefined,
        );
        if (!synchronous) emit(subscriber);
        await setImmediate();

        const expected = outcome === 'event' ? { pubkey, ...profile } : { pubkey };
        expect(resolved).toHaveBeenCalledWith(new Map([[pubkey, expected]]));
        expect(await result).toEqual(new Map([[pubkey, expected]]));
        expect(subscriber.closed).toBe(true);
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
      });
    }
  }

  test('keeps an unfinished query open until the timeout and then releases it', async () => {
    const { subscriber, teardown, resolved, result } = setup();
    jest.advanceTimersByTime(9999);
    await setImmediate();
    expect(resolved).not.toHaveBeenCalled();
    expect(subscriber.closed).toBe(false);
    expect(teardown).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(await result).toEqual(new Map([[pubkey, { pubkey }]]));
    expect(subscriber.closed).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
