import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

const okJson = <T>(value: T) =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(value as unknown),
  } as Response);

const errJson = (status: number, detail: string) =>
  Promise.resolve({
    ok: false,
    status,
    statusText: "Bad",
    json: () => Promise.resolve({ detail }),
  } as Response);

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createInstantMeeting POSTs with no body", async () => {
    fetchMock.mockReturnValueOnce(okJson({ meeting: {}, participant: {} }));
    await api.createInstantMeeting();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/meetings\/instant$/);
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBeUndefined();
  });

  it("scheduleMeeting sends only the schedule fields (no host_name)", async () => {
    fetchMock.mockReturnValueOnce(okJson({}));
    await api.scheduleMeeting({
      title: "Sync",
      scheduled_at: "2030-01-01T00:00:00Z",
      duration_mins: 30,
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      title: "Sync",
      scheduled_at: "2030-01-01T00:00:00Z",
      duration_mins: 30,
    });
    expect(body).not.toHaveProperty("host_name");
  });

  it("joinMeeting sends display_name only", async () => {
    fetchMock.mockReturnValueOnce(okJson({}));
    await api.joinMeeting("abc-def0-1234", "Alice");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ display_name: "Alice" });
  });

  it("propagates server error detail", async () => {
    fetchMock.mockReturnValueOnce(errJson(404, "Meeting not found"));
    await expect(api.getMeeting("nope")).rejects.toThrow("Meeting not found");
  });

  it("uploadRecording sends multipart FormData", async () => {
    fetchMock.mockReturnValueOnce(okJson({}));
    const blob = new Blob(["x"], { type: "video/webm" });
    await api.uploadRecording("abc", blob, "Title", 12, 7);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get("title")).toBe("Title");
    expect(fd.get("duration_secs")).toBe("12");
    expect(fd.get("participant_id")).toBe("7");
    expect(fd.get("file")).toBeInstanceOf(Blob);
  });
});
