import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallPromptCard } from "./InstallPromptCard";

const installPromptMock = vi.fn();

vi.mock("../hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => installPromptMock()
}));

vi.mock("../store/useAppStore", () => ({
  useAppStore: vi.fn((selector: (state: { settings: { language: "de" | "en" } }) => unknown) =>
    selector({ settings: { language: "de" } })
  )
}));

function setPromptState(overrides: Record<string, unknown> = {}) {
  installPromptMock.mockReturnValue({
    canInstall: true,
    isIOS: false,
    deferredPrompt: {},
    installed: false,
    dismissed: false,
    promptInstall: vi.fn(async () => "accepted"),
    dismiss: vi.fn(),
    ...overrides
  });
}

describe("InstallPromptCard", () => {
  beforeEach(() => {
    installPromptMock.mockReset();
  });

  it("renders the install CTA when installable", () => {
    setPromptState();
    render(<InstallPromptCard />);
    expect(screen.getByRole("region", { name: "App installieren" })).toBeInTheDocument();
    expect(screen.getByText("Installieren")).toBeInTheDocument();
  });

  it("renders nothing when not installable", () => {
    setPromptState({ canInstall: false });
    const { container } = render(<InstallPromptCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows iOS manual instructions and hides the native install button on iOS", () => {
    setPromptState({ isIOS: true });
    render(<InstallPromptCard />);
    expect(screen.getByText("Zum Home-Bildschirm hinzufügen")).toBeInTheDocument();
    expect(screen.getByText(/Tippe unten auf das Teilen-Symbol/)).toBeInTheDocument();
    expect(screen.queryByText("Installieren")).not.toBeInTheDocument();
  });

  it("calls dismiss when the dismiss button is clicked", () => {
    const dismiss = vi.fn();
    setPromptState({ dismiss });
    render(<InstallPromptCard />);
    fireEvent.click(screen.getByText("Später"));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("calls promptInstall when the install button is clicked", async () => {
    const promptInstall = vi.fn(async () => "accepted");
    setPromptState({ promptInstall });
    render(<InstallPromptCard />);
    await act(async () => {
      fireEvent.click(screen.getByText("Installieren"));
    });
    expect(promptInstall).toHaveBeenCalled();
  });
});
