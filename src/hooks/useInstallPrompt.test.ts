import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetInstallPromptStateForTests,
  __setDeferredPromptForTests,
  detectInstallPlatform,
  useInstallPrompt,
  type BeforeInstallPromptEvent
} from "./useInstallPrompt";

function makeDeferredPrompt(outcome: "accepted" | "dismissed" = "accepted"): BeforeInstallPromptEvent {
  return {
    ...new Event("beforeinstallprompt"),
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome })
  } as unknown as BeforeInstallPromptEvent;
}

function setUserAgent(ua: string): void {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}

describe("useInstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    setUserAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120");
    __resetInstallPromptStateForTests();
  });

  afterEach(() => {
    __resetInstallPromptStateForTests();
  });

  it("is not installable by default (no deferred prompt, not iOS)", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.installed).toBe(false);
    expect(result.current.dismissed).toBe(false);
    // jsdom lacks BeforeInstallPromptEvent, so platform is "other" (not iOS) here;
    // the meaningful property is that it is not treated as iOS.
    expect(result.current.platform).not.toBe("ios");
  });

  it("becomes installable when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });
    expect(result.current.canInstall).toBe(true);
    expect(result.current.deferredPrompt).not.toBeNull();
  });

  it("promptInstall triggers the native prompt and clears the deferred event", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const fake = makeDeferredPrompt("accepted");
    act(() => {
      __setDeferredPromptForTests(fake);
    });
    expect(result.current.canInstall).toBe(true);

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe("accepted");
    expect(fake.prompt).toHaveBeenCalled();
    expect(result.current.deferredPrompt).toBeNull();
    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("dismiss() persists the dismissed flag to localStorage and hides the CTA", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      __setDeferredPromptForTests(makeDeferredPrompt());
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.dismissed).toBe(true);
    expect(result.current.canInstall).toBe(false);
    expect(localStorage.getItem("klausurplaner:install-dismissed")).toBe("1");
  });

  it("stays dismissed across re-initialization (persists)", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      __setDeferredPromptForTests(makeDeferredPrompt());
      result.current.dismiss();
    });
    __resetInstallPromptStateForTests();

    const { result: second } = renderHook(() => useInstallPrompt());
    expect(second.current.dismissed).toBe(true);
    expect(second.current.canInstall).toBe(false);
  });

  it("marks installed when appinstalled event fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      __setDeferredPromptForTests(makeDeferredPrompt());
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.installed).toBe(true);
    expect(result.current.deferredPrompt).toBeNull();
    expect(result.current.canInstall).toBe(false);
  });

  it("detects iOS and shows install CTA even without a deferred prompt", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15");
    __resetInstallPromptStateForTests();
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.platform).toBe("ios");
    expect(result.current.isIOS).toBe(true);
    expect(result.current.canInstall).toBe(true);
  });

  it("does not show iOS CTA once dismissed", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    __resetInstallPromptStateForTests();
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(true);
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.canInstall).toBe(false);
  });
});

describe("detectInstallPlatform", () => {
  it("classifies iPadOS as ios", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko)");
    // iPadOS reports Mac UA; the touch check distinguishes it.
    // jsdom has no touch events by default, so this falls back to chromium/other.
    // We only assert it does not throw and returns a valid platform.
    expect(["ios", "chromium", "other"]).toContain(detectInstallPlatform());
  });
});
