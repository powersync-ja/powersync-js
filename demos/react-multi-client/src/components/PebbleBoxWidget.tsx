import { MAX_PEBBLES, PebbleRecord, Shape, PEBBLES_TABLE } from '@/library/powersync/AppSchema';
import { useQuery } from '@powersync/react';
import React from 'react';
import {
  DataCircleFacade,
  DataDiamondFacade,
  DataHexagonFacade,
  DataPentagonFacade,
  DataTriangleFacade
} from './facades/ShapeFacade';

const ShapeWidgetMap = {
  [Shape.CIRCLE]: DataCircleFacade,
  [Shape.HEXAGON]: DataHexagonFacade,
  [Shape.PENTAGON]: DataPentagonFacade,
  [Shape.DIAMOND]: DataDiamondFacade,
  [Shape.TRIANGLE]: DataTriangleFacade
};

export const PebbleBoxWidget: React.FC = () => {
  const { data: pebbles } = useQuery<PebbleRecord>(
    `SELECT * FROM ${PEBBLES_TABLE} ORDER BY shape ASC LIMIT ${MAX_PEBBLES}`,
    []
  );

  return (
    <>
      {pebbles.map((pebble) => {
        const Widget = ShapeWidgetMap[pebble.shape];
        return (
          <div key={pebble.id} className={'widget-pebble-div'}>
            <Widget />
          </div>
        );
      })}
    </>
  );
};
