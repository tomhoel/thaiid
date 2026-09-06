import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/TabBar';

/**
 * The shell the tabbed screens render inside.
 *
 * Expo Router's `Tabs` handed each screen a viewport that already excluded the
 * tab bar. Reproducing that here means the screens can keep sizing themselves
 * with `h-full` and stay unaware of the bar — which matters for the identity
 * panel, whose drag range is measured against its own container.
 */
export function TabLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <div className="relative min-h-0 flex-1">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
