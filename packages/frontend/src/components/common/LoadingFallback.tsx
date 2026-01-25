import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Loading fallback component for React.lazy() Suspense boundaries
 * Used during code-split chunk loading
 */
export default function LoadingFallback({
  message = 'Loading...',
  fullScreen = false,
}: LoadingFallbackProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight={fullScreen ? '100vh' : '200px'}
      gap={2}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
