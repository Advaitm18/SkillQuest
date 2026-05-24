/**
 * Theme entry: use `createAppTheme(mode)` from the app root with theme store.
 * Default export kept for any legacy imports.
 */
export { createAppTheme } from './theme/createAppTheme';
import { createAppTheme } from './theme/createAppTheme';

export const theme = createAppTheme('dark');
