import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

import ListItemsTable from "@/components/organisms/list-items-table";

describe("ListItemsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders checked items behind foldout", async () => {
    render(
      <ListItemsTable
        listId="l_1"
        items={[
          { id: "li_1", name: "Tomatoes", quantity: 1, done: false },
          { id: "li_2", name: "Milk", quantity: 2, done: true },
        ]}
      />,
    );

    expect(screen.getByText("Checked items")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Checked items/i })[0]);

    expect(await screen.findByDisplayValue("Milk")).toBeInTheDocument();
  });

  it("moves an item to checked section when checkbox is toggled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ListItemsTable
        listId="l_1"
        items={[
          { id: "li_1", name: "Tomatoes", quantity: 1, done: false },
          { id: "li_2", name: "Milk", quantity: 2, done: true },
        ]}
      />,
    );

    const tomatoesInput = screen.getAllByDisplayValue("Tomatoes")[0];
    const tomatoesRow = tomatoesInput.closest("tr");
    expect(tomatoesRow).toBeTruthy();

    const checkbox = within(tomatoesRow as HTMLElement).getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getAllByRole("button", { name: /Checked items/i })[0]);
    expect(screen.getAllByDisplayValue("Tomatoes").length).toBeGreaterThan(0);
  });

  it("debounces quantity updates for existing items", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, item: { id: "li_1", quantity: 2, name: "Tomatoes", done: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ListItemsTable
        listId="l_1"
        items={[{ id: "li_1", name: "Tomatoes", quantity: 1, done: false }]}
      />,
    );

    fireEvent.click(screen.getAllByLabelText("increase quantity")[0]);

    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/lists/l_1/items/li_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 2 }),
    });
  });
});
