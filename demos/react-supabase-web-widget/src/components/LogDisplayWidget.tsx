import React from 'react';

export interface LogDisplayWidgetProps {
  lines: string[];
}

export const LogDisplayWidget: React.FC<LogDisplayWidgetProps> = (props) => {
  return (
    <div className={'log-container'}>
      {props.lines.map((log, i) => (
        <p key={i} className="log-line">
          {log}
        </p>
      ))}
    </div>
  );
};
