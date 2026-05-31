export type EventPayload = Record<string, unknown>;

export interface GovernanceEvent<T extends EventPayload = EventPayload> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  source: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

export type EventHandler<T extends EventPayload = EventPayload> = (
  event: GovernanceEvent<T>
) => void | Promise<void>;

interface TopicSubscription {
  topic: string;
  handler: EventHandler;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

interface RateLimitConfig {
  maxEvents: number;
  windowMs: number;
}

const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2, low: 3 };

export class EventGovernor {
  private subscriptions: Map<string, TopicSubscription[]> = new Map();
  private wildcardHandlers: TopicSubscription[] = [];
  private eventQueue: GovernanceEvent[] = [];
  private processing = false;
  private rateLimits: Map<string, RateLimitConfig> = new Map();
  private rateLimitCounters: Map<string, number[]> = new Map();
  private eventLog: GovernanceEvent[] = [];
  private maxLogSize = 200;
  private idCounter = 0;

  private generateId(): string {
    this.idCounter += 1;
    return `evt_${Date.now()}_${this.idCounter}`;
  }

  publish<T extends EventPayload>(
    topic: string,
    payload: T,
    source: string,
    priority: GovernanceEvent['priority'] = 'normal'
  ): string {
    const eventId = this.generateId();
    const event: GovernanceEvent<T> = {
      id: eventId,
      topic,
      payload,
      timestamp: Date.now(),
      source,
      priority,
    };

    if (this.isRateLimited(topic)) {
      console.warn(`[EventGovernor] Rate limited: ${topic} from ${source}`);
      return eventId;
    }

    this.eventLog.push(event as GovernanceEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    this.eventQueue.push(event as GovernanceEvent);
    this.processQueue();

    return eventId;
  }

  subscribe<T extends EventPayload>(
    topic: string,
    handler: EventHandler<T>,
    priority: GovernanceEvent['priority'] = 'normal'
  ): () => void {
    const sub: TopicSubscription = {
      topic,
      handler: handler as EventHandler,
      priority,
    };

    if (topic === '*') {
      this.wildcardHandlers.push(sub);
      this.wildcardHandlers.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
    } else {
      const subs = this.subscriptions.get(topic) || [];
      subs.push(sub);
      subs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      this.subscriptions.set(topic, subs);
    }

    return () => {
      if (topic === '*') {
        this.wildcardHandlers = this.wildcardHandlers.filter((h) => h !== sub);
      } else {
        const subs = this.subscriptions.get(topic);
        if (subs) {
          const idx = subs.indexOf(sub);
          if (idx !== -1) subs.splice(idx, 1);
        }
      }
    };
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      await this.dispatchEvent(event);
    }

    this.processing = false;
  }

  private async dispatchEvent(event: GovernanceEvent): Promise<void> {
    const topicHandlers = this.subscriptions.get(event.topic) || [];
    const wildcardHandlers = this.wildcardHandlers;

    const allHandlers = [...topicHandlers, ...wildcardHandlers].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    for (const sub of allHandlers) {
      try {
        const result = sub.handler(event);
        if (result instanceof Promise) {
          await result;
        }
      } catch (e) {
        console.error(
          `[EventGovernor] Handler error for topic "${event.topic}":`,
          e
        );
      }
    }
  }

  private isRateLimited(topic: string): boolean {
    const config = this.rateLimits.get(topic);
    if (!config) return false;

    const now = Date.now();
    const timestamps = this.rateLimitCounters.get(topic) || [];
    const valid = timestamps.filter((t) => now - t < config.windowMs);
    this.rateLimitCounters.set(topic, valid);

    if (valid.length >= config.maxEvents) {
      return true;
    }

    valid.push(now);
    return false;
  }

  setRateLimit(topic: string, maxEvents: number, windowMs: number): void {
    this.rateLimits.set(topic, { maxEvents, windowMs });
  }

  getEventLog(
    topic?: string,
    limit = 50
  ): ReadonlyArray<GovernanceEvent> {
    let log = this.eventLog;
    if (topic) {
      log = log.filter((e) => e.topic === topic);
    }
    return log.slice(-limit);
  }

  getQueueLength(): number {
    return this.eventQueue.length;
  }

  flush(): void {
    this.eventQueue = [];
    this.processing = false;
  }

  destroy(): void {
    this.subscriptions.clear();
    this.wildcardHandlers = [];
    this.eventQueue = [];
    this.eventLog = [];
    this.rateLimits.clear();
    this.rateLimitCounters.clear();
  }
}
