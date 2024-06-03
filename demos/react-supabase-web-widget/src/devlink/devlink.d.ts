type IXData = any;

type IXEngine = {
  init: (data: IXData) => void;
};

export declare const createIX2Engine: () => IXEngine;
