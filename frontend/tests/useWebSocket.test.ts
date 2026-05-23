import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWebSocket } from "@/hooks/useWebSocket";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }

  // Test helpers
  triggerOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  triggerClose(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

describe("useWebSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle when given a null url", () => {
    const { result } = renderHook(() => useWebSocket(null));
    expect(result.current.status).toBe("idle");
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("connects and transitions to open", async () => {
    const { result } = renderHook(() => useWebSocket("ws://example/test"));
    expect(result.current.status).toBe("connecting");
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => FakeWebSocket.instances[0].triggerOpen());
    await waitFor(() => expect(result.current.status).toBe("open"));
  });

  it("queues sends before open and flushes on open", async () => {
    const { result } = renderHook(() => useWebSocket("ws://example/test"));
    act(() => result.current.send({ type: "host-mute-all", payload: {} }));
    expect(FakeWebSocket.instances[0].sent).toEqual([]);

    act(() => FakeWebSocket.instances[0].triggerOpen());
    await waitFor(() =>
      expect(FakeWebSocket.instances[0].sent).toHaveLength(1)
    );
    expect(JSON.parse(FakeWebSocket.instances[0].sent[0])).toEqual({
      type: "host-mute-all",
      payload: {},
    });
  });

  it("dispatches parsed messages to subscribers", async () => {
    const { result } = renderHook(() => useWebSocket("ws://example/test"));
    const handler = vi.fn();
    act(() => {
      result.current.subscribe(handler);
      FakeWebSocket.instances[0].triggerOpen();
    });
    act(() =>
      FakeWebSocket.instances[0].triggerMessage({
        type: "peer-left",
        payload: { clientId: 9 },
      })
    );
    expect(handler).toHaveBeenCalledWith({
      type: "peer-left",
      payload: { clientId: 9 },
    });
  });

  it("does not reconnect on 4xxx close codes", async () => {
    const { result } = renderHook(() => useWebSocket("ws://example/test"));
    act(() => FakeWebSocket.instances[0].triggerOpen());
    act(() => FakeWebSocket.instances[0].triggerClose(4003));
    await waitFor(() => expect(result.current.status).toBe("closed"));
    // Still only one instance — no reconnect attempt scheduled.
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
