import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "@/components/atoms/link";
import styles from "./page.module.scss";

const modules = [
  {
    name: "AI Assistant",
    description: "Chat with AI assistants and organize grouped conversations.",
    href: "/assistant",
    icon: SmartToyOutlinedIcon,
  },
  {
    name: "List Manager",
    description: "Create and manage lists with reusable presets.",
    href: "/list",
    icon: FormatListBulletedOutlinedIcon,
  },
];

export default function Home() {
  return (
    <Stack spacing={4} sx={{ maxWidth: 1100, mx: "auto", mt: 6, px: 2 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Platform Modules
        </Typography>
        <Typography color="text.secondary">Choose a module to open its workspace.</Typography>
      </Box>

      <Grid container spacing={3}>
        {modules.map((module) => {
          const ModuleIcon = module.icon;
          return (
            <Grid key={module.href} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card className={styles.moduleCard} variant="outlined">
                <CardActionArea component={Link} href={module.href} className={styles.cardAction}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box className={styles.iconWrapper}>
                        <ModuleIcon fontSize="small" />
                      </Box>
                      <Typography variant="h6" component="h2">
                        {module.name}
                      </Typography>
                      <Typography color="text.secondary">{module.description}</Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box className={styles.comingSoon}>
        <AppsOutlinedIcon fontSize="small" />
        <Typography color="text.secondary">More modules coming soon.</Typography>
      </Box>
    </Stack>
  );
}
