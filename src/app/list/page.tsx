import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { cookies } from "next/headers";
import AppLink from "@/components/atoms/link";
import CreateListForm from "@/components/molecules/create-list-form";
import { AUTH_EMAIL_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ListOverviewPage() {
  const cookieStore = await cookies();
  const authenticatedEmail = cookieStore.get(AUTH_EMAIL_COOKIE_NAME)?.value ?? "";

  if (!authenticatedEmail) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 720, mx: "auto", mt: 6, px: 2 }}>
        <Typography variant="h4" component="h1">
          Lists
        </Typography>
        <Typography color="error">You must be logged in to view your lists.</Typography>
      </Stack>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: authenticatedEmail },
    select: { id: true },
  });

  if (!user) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 720, mx: "auto", mt: 6, px: 2 }}>
        <Typography variant="h4" component="h1">
          Lists
        </Typography>
        <Typography color="error">User not found.</Typography>
      </Stack>
    );
  }

  const lists = await prisma.list.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto", mt: 6, px: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          Your Lists
        </Typography>
      </Box>

      {lists.length === 0 ? (
        <Typography color="text.secondary">You do not have any lists yet.</Typography>
      ) : (
        <List>
          {lists.map((list) => (
            <ListItem key={list.id} disablePadding>
              <Button component={AppLink} href={`/list/${list.id}`} fullWidth sx={{ justifyContent: "flex-start" }}>
                <ListItemText primary={list.name} />
              </Button>
            </ListItem>
          ))}
        </List>
      )}

      <CreateListForm />
    </Stack>
  );
}
