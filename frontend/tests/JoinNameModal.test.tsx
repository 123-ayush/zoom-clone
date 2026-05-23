import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import JoinNameModal from "@/components/modals/JoinNameModal";
import { UserProvider } from "@/context/UserContext";

const renderModal = (overrides: Partial<React.ComponentProps<typeof JoinNameModal>> = {}) => {
  const props = {
    meetingId: "abc-def0-1234",
    meetingTitle: "Weekly Sync",
    isOpen: true,
    onJoin: vi.fn(),
    loading: false,
    ...overrides,
  };
  return {
    props,
    ...render(
      <UserProvider>
        <JoinNameModal {...props} />
      </UserProvider>
    ),
  };
};

describe("JoinNameModal", () => {
  it("renders the meeting title and pre-fills the user's name", () => {
    renderModal();
    expect(screen.getByText("Weekly Sync")).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/enter your name/i) as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it("disables the join button when the name is blank", () => {
    const { props } = renderModal();
    const input = screen.getByPlaceholderText(/enter your name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    const btn = screen.getByRole("button", { name: /join now/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(props.onJoin).not.toHaveBeenCalled();
  });

  it("submits the trimmed display name", () => {
    const { props } = renderModal();
    const input = screen.getByPlaceholderText(/enter your name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Alice Liddell  " } });
    fireEvent.click(screen.getByRole("button", { name: /join now/i }));
    expect(props.onJoin).toHaveBeenCalledWith("Alice Liddell");
  });

  it("renders nothing when closed", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });
});
