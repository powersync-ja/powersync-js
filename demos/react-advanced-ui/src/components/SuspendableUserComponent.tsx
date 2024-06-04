import { UserComponent } from './UserComponent';
import { useSystem } from './providers/SystemProvider';
import { useState, useEffect } from 'react';

export interface UserComponentProps {
  leftSide?: boolean;
}

export const SuspendableUserComponent: React.FC<UserComponentProps> = (props) => {
  const connector = useSystem();

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!connector) {
      console.error(`No Supabase connector has been created yet.`);
      return;
    }

    if (!connector.ready) {
      const l = connector.registerListener({
        initialized: () => {
          /**
           * Redirect if on the entry view
           */
          if (connector.ready) {
            setShow(true);
          } else {
            setShow(false);
          }
        }
      });
      return () => l?.();
    }
  }, []);

  if (show) {
    return <UserComponent leftSide={props.leftSide} />;
  }

  return <>Loading</>;
};
