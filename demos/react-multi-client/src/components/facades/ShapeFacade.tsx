import { DataCircle, DataDiamond, DataHexagon, DataPentagon, DataTriangle } from '@/devlink';

// To drop the devlink dependency, you can use the following code:
// export const DataCircleFacade = () => <AlternativeCircle />;
export const DataCircleFacade = () => <DataCircle />;

export const DataHexagonFacade = () => <DataHexagon />;
export const DataPentagonFacade = () => <DataPentagon />;
export const DataDiamondFacade = () => <DataDiamond />;
export const DataTriangleFacade = () => <DataTriangle />;

const AlternativeCircle: React.FC = () => {
  const circleStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'yellow',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return <div style={circleStyle}></div>;
};
