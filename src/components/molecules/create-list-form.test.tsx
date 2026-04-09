import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

import CreateListForm from "@/components/molecules/create-list-form";

describe("CreateListForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows validation error when submitting empty name", async () => {
    render(<CreateListForm />);

    fireEvent.click(screen.getAllByRole("button", { name: "Add another list" })[0]);

    expect(await screen.findByText("Please enter a list name.")).toBeInTheDocument();
  });

  it("submits and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateListForm />);

    fireEvent.change(screen.getAllByLabelText("List name")[0], {
      target: { value: "Weekend prep" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add another list" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Weekend prep" }),
      });
      expect(refreshMock).toHaveBeenCalledOnce();
    });
  });
});
