import React from "react";
import * as _Builtin from "./_Builtin";
import { UserA } from "./UserA";
import { UserB } from "./UserB";

export function WebDemoWidget({
  as: _Component = _Builtin.Block,
  userAContent,
  userBContent,
  userAButtonCreate = {},
  userAButtonUpdate = {},
  userAButtonDelete = {},
  userBButtonCreate = {},
  userBButtonUpdate = {},
  userBButtonDelete = {},
  userALogText = (
    <>
      {"1 row created. Total time: 5 ms"}
      <br />
      {"1 row uploaded. Total time: 124 ms"}
    </>
  ),
  userBLogText = (
    <>
      {"1 row created. Total time: 5 ms"}
      <br />
      {"1 row uploaded. Total time: 124 ms"}
    </>
  ),
  userAOnline,
  userBOnline,
  userAOffline = false,
  userBOffline = false,
  userAWritesFalse,
  userAWritesTrue = false,
  userBWritesFalse,
  userBWritesTrue = false,
  userAReadsFalse,
  userAReadsTrue = false,
  userBReadsFalse,
  userBReadsTrue = false,
  userBRead,
  userBWrite,
  userARead,
  userAWrite,
  writeBackendToDb,
  readDbToPs,
  userASlot,
  userBSlot,
}) {
  return (
    <_Component className="web-demo-widget" tag="div">
      <_Builtin.Block className="demo-widget-div" tag="div">
        <UserA
          userASlot={userASlot}
          online={userAOnline}
          offline={userAOffline}
          content={userAContent}
          buttonCreate={userAButtonCreate}
          buttonUpdate={userAButtonUpdate}
          buttonDelete={userAButtonDelete}
          logText={userALogText}
          writesFalse={userAWritesFalse}
          writesTrue={userAWritesTrue}
          writePath={userAWrite}
          readsFalse={userAReadsFalse}
          readsTrue={userAReadsTrue}
          readPath={userARead}
        />
        <_Builtin.Block className="widget-under-hood-components-div" tag="div">
          <_Builtin.Block
            className="component-under-hood component-backend"
            tag="div"
          >
            <_Builtin.Block className="component-label" tag="div">
              {"BACKEND"}
            </_Builtin.Block>
          </_Builtin.Block>
          <_Builtin.Block
            className="component-arrow-backend-to-db"
            tag="div"
            {...writeBackendToDb}
          >
            <_Builtin.Image
              className="arrow-backend-db"
              loading="lazy"
              width="auto"
              height="24"
              alt=""
              src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f8d9dcee745a0be785a3c_path-arrow-component-001.svg"
            />
          </_Builtin.Block>
          <_Builtin.Block
            className="component-under-hood component-postgres"
            tag="div"
          >
            <_Builtin.Block className="component-label" tag="div">
              {"POSTGRES"}
            </_Builtin.Block>
          </_Builtin.Block>
          <_Builtin.Block
            className="component-arrow-db-to-ps"
            tag="div"
            {...readDbToPs}
          >
            <_Builtin.Image
              className="arrow-db-ps"
              loading="lazy"
              width="Auto"
              height="24"
              alt=""
              src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f8d9dcee745a0be785a3c_path-arrow-component-001.svg"
            />
          </_Builtin.Block>
          <_Builtin.Block
            className="component-under-hood component-powersync"
            tag="div"
          >
            <_Builtin.Image
              className="component-icon-ps"
              loading="lazy"
              width="auto"
              height="auto"
              alt=""
              src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f556ea234aa0d222e5917_icon-powersync.svg"
            />
            <_Builtin.Block className="component-label" tag="div">
              {"POWERSYNC"}
              <br />
              {"SERVICE"}
            </_Builtin.Block>
          </_Builtin.Block>
        </_Builtin.Block>
        <UserB
          userBSlot={userBSlot}
          writesFalse={userBWritesFalse}
          writesTrue={userBWritesTrue}
          writePath={userBWrite}
          readsFalse={userBReadsFalse}
          readsTrue={userBReadsTrue}
          readPath={userBRead}
          online={userBOnline}
          offline={userBOffline}
          content={userBContent}
          buttonCreate={userBButtonCreate}
          buttonUpdate={userBButtonUpdate}
          buttonDelete={userBButtonDelete}
          logText={userBLogText}
        />
      </_Builtin.Block>
    </_Component>
  );
}
