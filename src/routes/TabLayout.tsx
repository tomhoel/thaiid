import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/TabBar';
import { useAppearance } from '@/features/theme/useAppearance';

/**
 * The shell the tabbed screens render inside.
 *
 * Expo Router's `Tabs` handed each screen a viewport that already excluded the
 * tab bar. Reproducing that here means the screens can keep sizing themselves
 * with `h-full` and stay unaware of the bar — which matters for the identity
 * panel, whose drag range is measured against its own container.
 *
 * The shell is capped at a handset width. This was a phone-only app, and every
 * measurement in it is phone-shaped: the card is sized as `width - 40` from a
 * ~1000px source, and three tabs stretched across a desktop viewport read as a
 * mistake. Capping keeps the card sharp and the proportions honest, and on a
 * phone the cap never binds.
 */
export function TabLayout() {
  // One owner for the theme class and the country accent, so every tab agrees.
  useAppearance();

  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-bg-elevated">
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-bg">
        <div className="relative min-h-0 flex-1">
          <Outlet />
        </div>
        <TabBar />
      </div>
    </div>
  );
}
