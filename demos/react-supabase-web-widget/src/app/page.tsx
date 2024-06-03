import { SuspendableUserComponent } from '@/components/SuspendableUserComponent';
import { WebWidgetFacade } from '@/components/facades/WebWidgetFacade';
import SystemProvider from '@/components/providers/SystemProvider';
import '@/styles/widget.css';

export default function EntryPage() {
  return (
    <div className={'widget-wrapper'}>
      <WebWidgetFacade
        userASlot={
          <SystemProvider dbFilename={'userA.db'}>
            <SuspendableUserComponent leftSide={true} />
          </SystemProvider>
        }
        userBSlot={
          <SystemProvider dbFilename={'userB.db'}>
            <SuspendableUserComponent />
          </SystemProvider>
        }
      />
    </div>
  );
}
