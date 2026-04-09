"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import { useRouter } from "next/navigation";

type ListItemRow = {
  id: string;
  quantity: number;
  name: string;
  done: boolean;
};

type ListItemsTableProps = {
  listId: string;
  items: ListItemRow[];
};

type DisplayListItemRow = ListItemRow & {
  optimistic?: boolean;
};

const editableFieldSx = {
  width: "100%",
  height: "100%",
  "& .MuiInputBase-root": { height: "100%" },
  "& .MuiInput-root::before": { borderBottom: "none !important" },
  "& .MuiInput-root::after": { borderBottom: "none !important" },
  "& .MuiInput-root:hover:not(.Mui-disabled, .Mui-error)::before": {
    borderBottom: "none !important",
  },
  "& .MuiInputBase-input": { py: 0 },
};
const ITEM_UPDATE_DEBOUNCE_MS = 1000;

export default function ListItemsTable({ listId, items }: ListItemsTableProps) {
  const router = useRouter();
  const [displayItems, setDisplayItems] = useState<DisplayListItemRow[]>(items);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemIds, setDeletingItemIds] = useState<Record<string, boolean>>({});
  const [rowIconRotations, setRowIconRotations] = useState<Record<string, number>>({});
  const [dragEnabledItemId, setDragEnabledItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingUpdatesRef = useRef<Record<string, Partial<Pick<ListItemRow, "name" | "quantity" | "done">>>>({});
  const rowAnimationTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const dragStartOrderRef = useRef<string[] | null>(null);

  useEffect(() => {
    setDisplayItems(sortDoneItemsToBottom(items));
  }, [items]);

  useEffect(() => {
    const saveTimeouts = saveTimeoutsRef.current;
    const rowAnimationTimeouts = rowAnimationTimeoutsRef.current;
    return () => {
      Object.values(saveTimeouts).forEach((timeoutId) => clearTimeout(timeoutId));
      Object.values(rowAnimationTimeouts).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const triggerRowIconAnimation = (itemId: string) => {
    setRowIconRotations((prev) => ({ ...prev, [itemId]: 45 }));
    if (rowAnimationTimeoutsRef.current[itemId]) {
      clearTimeout(rowAnimationTimeoutsRef.current[itemId]);
    }

    rowAnimationTimeoutsRef.current[itemId] = setTimeout(() => {
      setRowIconRotations((prev) => ({ ...prev, [itemId]: 0 }));
      delete rowAnimationTimeoutsRef.current[itemId];
    }, 20);
  };

  const captureRowTopPositions = () => {
    const positions: Record<string, number> = {};
    for (const [id, row] of Object.entries(rowRefs.current)) {
      if (row) {
        positions[id] = row.getBoundingClientRect().top;
      }
    }
    return positions;
  };

  const animateRowsShift = (previousPositions: Record<string, number>) => {
    const nextPositions = captureRowTopPositions();
    for (const [id, nextTop] of Object.entries(nextPositions)) {
      const previousTop = previousPositions[id];
      if (previousTop === undefined) {
        continue;
      }

      const delta = previousTop - nextTop;
      if (!delta) {
        continue;
      }

      const row = rowRefs.current[id];
      if (!row) {
        continue;
      }

      row.style.transition = "none";
      row.style.transform = `translateY(${delta}px)`;

      requestAnimationFrame(() => {
        row.style.transition = "transform 220ms ease";
        row.style.transform = "translateY(0)";
      });

      const cleanup = () => {
        if (!row) {
          return;
        }
        row.style.transition = "";
        row.style.transform = "";
        row.removeEventListener("transitionend", cleanup);
      };
      row.addEventListener("transitionend", cleanup);
    }
  };

  const saveItemUpdate = async (
    itemId: string,
    payload: Partial<Pick<ListItemRow, "name" | "quantity" | "done">>,
  ) => {
    try {
      const response = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        item?: ListItemRow;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to save list item.");
        return;
      }

      if (data.item) {
        setDisplayItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, ...data.item, optimistic: false } : item)),
        );
      }
    } catch {
      setError("Unexpected error while saving list item.");
    }
  };

  const scheduleItemSave = (
    itemId: string,
    payload: Partial<Pick<ListItemRow, "name" | "quantity" | "done">>,
  ) => {
    pendingUpdatesRef.current[itemId] = {
      ...(pendingUpdatesRef.current[itemId] ?? {}),
      ...payload,
    };

    if (saveTimeoutsRef.current[itemId]) {
      clearTimeout(saveTimeoutsRef.current[itemId]);
    }

    saveTimeoutsRef.current[itemId] = setTimeout(() => {
      const queuedPayload = pendingUpdatesRef.current[itemId];
      delete pendingUpdatesRef.current[itemId];
      delete saveTimeoutsRef.current[itemId];

      if (queuedPayload) {
        void saveItemUpdate(itemId, queuedPayload);
      }
    }, ITEM_UPDATE_DEBOUNCE_MS);
  };

  const addItem = async () => {
    setError(null);

    const name = newItemName.trim();
    const quantity = Number(newItemQuantity);

    if (!name) {
      setError("Please enter an item name.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a positive integer.");
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    setDisplayItems((prev) => [
      ...prev,
      {
        id: optimisticId,
        quantity,
        name,
        done: false,
        optimistic: true,
      },
    ]);
    triggerRowIconAnimation(optimisticId);
    setNewItemName("");
    setNewItemQuantity("1");

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          quantity,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        item?: ListItemRow;
      };
      if (!response.ok) {
        setDisplayItems((prev) => prev.filter((item) => item.id !== optimisticId));
        setError(data.error ?? "Unable to add item.");
        return;
      }

      if (data.item) {
        const createdItem = data.item;
        setDisplayItems((prev) =>
          prev.map((item) =>
            item.id === optimisticId
              ? {
                  ...createdItem,
                  optimistic: false,
                }
              : item,
          ),
        );
      }
      router.refresh();
    } catch {
      setDisplayItems((prev) => prev.filter((item) => item.id !== optimisticId));
      setError("Unexpected error while adding item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await addItem();
  };

  const moveItem = (list: DisplayListItemRow[], fromId: string, toId: string) => {
    const fromIndex = list.findIndex((item) => item.id === fromId);
    const toIndex = list.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return list;
    }

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) {
      return list;
    }
    next.splice(toIndex, 0, moved);
    return next;
  };

  const canMoveBetweenItems = (list: DisplayListItemRow[], fromId: string, toId: string) => {
    const fromItem = list.find((item) => item.id === fromId);
    const toItem = list.find((item) => item.id === toId);
    if (!fromItem || !toItem) {
      return false;
    }

    // Keep checked/unchecked partitions stable while allowing reorder inside each partition.
    return fromItem.done === toItem.done;
  };

  const sortDoneItemsToBottom = (list: DisplayListItemRow[]) => {
    const notDone = list.filter((entry) => !entry.done);
    const done = list.filter((entry) => entry.done);
    return [...notDone, ...done];
  };

  const isSameOrder = (a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  };

  const persistReorder = async (
    orderedItemIds: string[],
    options?: {
      refresh?: boolean;
    },
  ) => {
    const shouldRefresh = options?.refresh ?? true;
    if (orderedItemIds.length === 0) {
      return;
    }
    try {
      const response = await fetch(`/api/lists/${listId}/items/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemIds: orderedItemIds }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to reorder list items.");
        router.refresh();
        return;
      }
      if (shouldRefresh) {
        router.refresh();
      }
    } catch {
      setError("Unexpected error while reordering list items.");
      router.refresh();
    }
  };

  const deleteItem = async (itemId: string) => {
    if (deletingItemIds[itemId]) {
      return;
    }

    setError(null);
    setDeletingItemIds((prev) => ({ ...prev, [itemId]: true }));

    if (saveTimeoutsRef.current[itemId]) {
      clearTimeout(saveTimeoutsRef.current[itemId]);
      delete saveTimeoutsRef.current[itemId];
    }
    delete pendingUpdatesRef.current[itemId];

    await new Promise((resolve) => setTimeout(resolve, 180));

    try {
      const response = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setDeletingItemIds((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        setError(data.error ?? "Unable to delete list item.");
        return;
      }

      const previousPositions = captureRowTopPositions();
      setDisplayItems((prev) => prev.filter((item) => item.id !== itemId));
      setDeletingItemIds((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      requestAnimationFrame(() => {
        animateRowsShift(previousPositions);
      });
      router.refresh();
    } catch {
      setDeletingItemIds((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setError("Unexpected error while deleting list item.");
    }
  };

  const uncheckedItems = displayItems.filter((item) => !item.done);
  const checkedItems = displayItems.filter((item) => item.done);

  const renderItemRow = (item: DisplayListItemRow) => (
    <TableRow
      key={item.id}
      ref={(row) => {
        rowRefs.current[item.id] = row;
      }}
      draggable={
        dragEnabledItemId === item.id && !item.optimistic && !deletingItemIds[item.id]
      }
      onDragStart={(event) => {
        if (dragEnabledItemId !== item.id || item.optimistic || deletingItemIds[item.id]) {
          event.preventDefault();
          return;
        }
        dragStartOrderRef.current = displayItems
          .filter((entry) => !entry.optimistic && !deletingItemIds[entry.id])
          .map((entry) => entry.id);
        setDraggingItemId(item.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!draggingItemId || draggingItemId === item.id) {
          return;
        }
        setDisplayItems((prev) => {
          if (!canMoveBetweenItems(prev, draggingItemId, item.id)) {
            return prev;
          }
          return moveItem(prev, draggingItemId, item.id);
        });
      }}
      onDragEnd={() => {
        const orderedIds = displayItems
          .filter((entry) => !entry.optimistic && !deletingItemIds[entry.id])
          .map((entry) => entry.id);
        const dragStartOrder = dragStartOrderRef.current;
        dragStartOrderRef.current = null;
        setDraggingItemId(null);
        setDragEnabledItemId(null);
        if (dragStartOrder && !isSameOrder(dragStartOrder, orderedIds)) {
          void persistReorder(orderedIds);
        }
      }}
      sx={{
        opacity: deletingItemIds[item.id] ? 0 : item.optimistic ? 0.6 : draggingItemId === item.id ? 0.4 : 1,
        transform: deletingItemIds[item.id] ? "scaleY(0.9)" : "scaleY(1)",
        transition: "opacity 180ms ease, transform 180ms ease",
        "& > td": item.done
          ? {
              borderBottom: "none",
              color: "text.disabled",
            }
          : { borderBottom: "none" },
        "& .MuiInputBase-input": item.done
          ? {
              color: "text.disabled",
            }
          : undefined,
        "& .MuiSvgIcon-root": item.done ? { color: "action.disabled" } : undefined,
      }}
    >
      <TableCell padding="checkbox">
        <IconButton
          aria-label="drag item"
          sx={{ cursor: "grab" }}
          onMouseDown={() => setDragEnabledItemId(item.id)}
          onMouseUp={() => setDragEnabledItemId(null)}
          onMouseLeave={() => {
            if (!draggingItemId) {
              setDragEnabledItemId(null);
            }
          }}
        >
          <DragIndicatorIcon />
        </IconButton>
      </TableCell>
      <TableCell padding="checkbox">
        <Checkbox
          checked={item.done}
          disabled={deletingItemIds[item.id]}
          onChange={(event) => {
            const done = event.target.checked;
            const previousPositions = captureRowTopPositions();
            let orderedIds: string[] = [];
            setDisplayItems((prev) => {
              const updated = prev.map((entry) =>
                entry.id === item.id ? { ...entry, done } : entry,
              );
              const reordered = sortDoneItemsToBottom(updated);
              orderedIds = reordered
                .filter((entry) => !entry.optimistic && !deletingItemIds[entry.id])
                .map((entry) => entry.id);
              return reordered;
            });
            requestAnimationFrame(() => {
              animateRowsShift(previousPositions);
            });
            if (!item.optimistic) {
              void saveItemUpdate(item.id, { done });
              void persistReorder(orderedIds, { refresh: false });
            }
          }}
        />
      </TableCell>
      <TableCell sx={{ width: "1%", whiteSpace: "nowrap", py: 0, height: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <IconButton
            size="small"
            aria-label="decrease quantity"
            disabled={deletingItemIds[item.id] || item.quantity <= 1}
            onClick={() => {
              const quantity = Math.max(1, item.quantity - 1);
              setDisplayItems((prev) =>
                prev.map((entry) => (entry.id === item.id ? { ...entry, quantity } : entry)),
              );
              if (!item.optimistic) {
                scheduleItemSave(item.id, { quantity });
              }
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <TextField
            size="small"
            type="number"
            value={String(item.quantity)}
            disabled={deletingItemIds[item.id]}
            onChange={(event) => {
              const rawValue = event.target.value;
              const quantity = Number(rawValue);
              if (!Number.isFinite(quantity)) {
                return;
              }
              const safeQuantity = Math.max(1, Math.trunc(quantity));
              setDisplayItems((prev) =>
                prev.map((entry) =>
                  entry.id === item.id ? { ...entry, quantity: safeQuantity } : entry,
                ),
              );
              if (!item.optimistic) {
                scheduleItemSave(item.id, { quantity: safeQuantity });
              }
            }}
            variant="standard"
            slotProps={{ input: { disableUnderline: true }, htmlInput: { min: 1 } }}
            sx={{
              ...editableFieldSx,
              width: 36,
              height: 32,
              "& .MuiInputBase-root": {
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              },
              "& .MuiInputBase-input": {
                height: "100%",
                py: 0,
                textAlign: "center",
                lineHeight: "32px",
                MozAppearance: "textfield",
              },
              "& .MuiInputBase-input::-webkit-outer-spin-button, & .MuiInputBase-input::-webkit-inner-spin-button":
                {
                  WebkitAppearance: "none",
                  margin: 0,
                },
            }}
          />
          <IconButton
            size="small"
            aria-label="increase quantity"
            disabled={deletingItemIds[item.id]}
            onClick={() => {
              const quantity = item.quantity + 1;
              setDisplayItems((prev) =>
                prev.map((entry) => (entry.id === item.id ? { ...entry, quantity } : entry)),
              );
              if (!item.optimistic) {
                scheduleItemSave(item.id, { quantity });
              }
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0, height: 48 }}>
        <TextField
          size="small"
          fullWidth
          value={item.name}
          disabled={deletingItemIds[item.id]}
          onChange={(event) => {
            const name = event.target.value;
            setDisplayItems((prev) =>
              prev.map((entry) => (entry.id === item.id ? { ...entry, name } : entry)),
            );
            if (!item.optimistic && name.trim()) {
              scheduleItemSave(item.id, { name });
            }
          }}
          variant="standard"
          slotProps={{ input: { disableUnderline: true } }}
          sx={editableFieldSx}
        />
      </TableCell>
      <TableCell align="right">
        <IconButton
          aria-label="delete"
          onClick={() => {
            void deleteItem(item.id);
          }}
          disabled={deletingItemIds[item.id]}
        >
          <CloseIcon
            sx={{
              transform: `rotate(${rowIconRotations[item.id] ?? 0}deg)`,
              transition: "transform 180ms ease",
            }}
          />
        </IconButton>
      </TableCell>
    </TableRow>
  );
  const addItemRow = (
    <TableRow sx={{ "& > td": { borderBottom: "none" } }}>
      <TableCell padding="checkbox" />
      <TableCell padding="checkbox" />
      <TableCell sx={{ width: "1%", whiteSpace: "nowrap", py: 0, height: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <IconButton
            size="small"
            aria-label="decrease new item quantity"
            onClick={() => {
              const next = Math.max(1, Number(newItemQuantity || 1) - 1);
              setNewItemQuantity(String(next));
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <TextField
            size="small"
            type="number"
            value={newItemQuantity}
            onChange={(event) => setNewItemQuantity(event.target.value)}
            variant="standard"
            slotProps={{ input: { disableUnderline: true }, htmlInput: { min: 1 } }}
            sx={{
              ...editableFieldSx,
              width: 36,
              height: 32,
              "& .MuiInputBase-root": {
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              },
              "& .MuiInputBase-input": {
                height: "100%",
                py: 0,
                textAlign: "center",
                lineHeight: "32px",
                MozAppearance: "textfield",
              },
              "& .MuiInputBase-input::-webkit-outer-spin-button, & .MuiInputBase-input::-webkit-inner-spin-button":
                {
                  WebkitAppearance: "none",
                  margin: 0,
                },
            }}
          />
          <IconButton
            size="small"
            aria-label="increase new item quantity"
            onClick={() => {
              const next = Math.max(1, Number(newItemQuantity || 1) + 1);
              setNewItemQuantity(String(next));
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0, height: 48 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a new item"
          value={newItemName}
          onChange={(event) => setNewItemName(event.target.value)}
          variant="standard"
          slotProps={{ input: { disableUnderline: true } }}
          sx={editableFieldSx}
        />
      </TableCell>
      <TableCell align="right">
        <IconButton aria-label="add item" type="submit" disabled={isSubmitting}>
          <CloseIcon
            sx={{
              transform: "rotate(45deg)",
              transition: "transform 180ms ease",
            }}
          />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  return (
    <Stack spacing={1}>
      <TableContainer component="form" onSubmit={handleSubmit}>
        <Table>
          <TableBody>
            {uncheckedItems.map((item) => (
              <Fragment key={item.id}>{renderItemRow(item)}</Fragment>
            ))}
            {addItemRow}
          </TableBody>
        </Table>
      </TableContainer>
      <Accordion disableGutters elevation={0} sx={{ borderTop: 1, borderColor: "divider" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Checked items</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0 }}>
          <TableContainer>
            <Table>
              <TableBody>
                {checkedItems.map((item) => (
                  <Fragment key={item.id}>{renderItemRow(item)}</Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
