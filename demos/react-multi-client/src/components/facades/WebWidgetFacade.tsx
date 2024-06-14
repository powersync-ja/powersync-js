import { WebDemoWidget } from '@/devlink';
import React from 'react';

export type WebWidgetProps = {
  userASlot?: React.ReactNode;
  userBSlot?: React.ReactNode;
};

export const WebWidgetFacade: React.FC<WebWidgetProps> = (props) => {
  const a = { props };

  return <WebDemoWidget {...props} />;

  // To drop the devlink dependency, you can use the following code:
  // return <Alternative {...props} />;
};

const Alternative: React.FC<WebWidgetProps> = (props) => {
  const slotA = props.userASlot;
  const slotB = props.userBSlot;
  return (
    <div style={{ display: 'flex' }}>
      {slotA ? slotA : <>A Not available</>}
      {slotB ? slotB : <>B Not available</>}
    </div>
  );
};
