import { MAX_PEBBLES, PebbleDef, Shape, TABLE_NAME } from '@/definitions/Schema';
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
  const { data: pebbles } = useQuery<PebbleDef>(
    `SELECT * FROM ${TABLE_NAME} ORDER BY shape ASC LIMIT ${MAX_PEBBLES}`,
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
