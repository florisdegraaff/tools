import Stack from "@mui/material/Stack";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";
import { cookies } from "next/headers";
import ListItemsTable from "@/components/organisms/list-items-table";
import { AUTH_EMAIL_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ListDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListPage({ params }: ListDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const authenticatedEmail = cookieStore.get(AUTH_EMAIL_COOKIE_NAME)?.value ?? "";

  if (!authenticatedEmail) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 900, mx: "auto", mt: 6, px: 2 }}>
        <Typography color="error">You must be logged in to view this list.</Typography>
      </Stack>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 900, mx: "auto", mt: 6, px: 2 }}>
        <Typography color="error">User not found.</Typography>
      </Stack>
    );
  }

  const list = await prisma.list.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          quantity: true,
          name: true,
          done: true,
        },
      },
    },
  });

  if (!list) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 900, mx: "auto", mt: 6, px: 2 }}>
        <Typography color="error">List not found.</Typography>
      </Stack>
    );
  }

  return (
    <TableContainer sx={{ maxWidth: 900, mx: "auto", mt: 2, px: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {list.name}
      </Typography>
      <ListItemsTable listId={list.id} items={list.items} />
    </TableContainer>
  );
}
