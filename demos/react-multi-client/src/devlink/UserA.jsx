import React from "react";
import * as _Builtin from "./_Builtin";
import { DataPentagon } from "./DataPentagon";

export function UserA({
  as: _Component = _Builtin.HFlex,
  userASlot,
  online,
  offline = false,
  content,
  buttonCreate = {},
  buttonUpdate = {},
  buttonDelete = {},
  logText = (
    <>
      {"1 row created. Total time: 5 ms"}
      <br />
      {"1 row uploaded. Total time: 124 ms"}
    </>
  ),
  writesFalse,
  writesTrue = false,
  writePath,
  readsFalse,
  readsTrue = false,
  readPath,
  onlineSync = false,
  onlineOfflineToggle,
}) {
  return (
    <_Component className="user-a-slot" tag="div">
      {userASlot ?? (
        <_Builtin.HFlex className="widget-h-flex" tag="div">
          <_Builtin.VFlex className="widget-v-flex" tag="div">
            <_Builtin.Block className="widget-user-div user-a" tag="div">
              <_Builtin.Block className="user-topbar-div" tag="div">
                <_Builtin.Block className="user-topbar-label user-a" tag="div">
                  {"User A"}
                </_Builtin.Block>
                <_Builtin.HFlex className="connectivity-toggle" tag="div">
                  <_Builtin.Link
                    className="toggle-button user-a"
                    macro={{
                      guid: "df55cee5-5b9b-f84b-ac36-88eb77495a59",
                    }}
                    button={false}
                    data-ix="toggle"
                    block="inline"
                    options={{
                      href: "#",
                    }}
                    {...onlineOfflineToggle}
                  >
                    <_Builtin.Block
                      className="toggle-button-green"
                      macro={{
                        guid: "df55cee5-5b9b-f84b-ac36-88eb77495a59",
                      }}
                      tag="div"
                      data-ix="toggle"
                    />
                    <_Builtin.Block className="button-toggle" tag="div" />
                  </_Builtin.Link>
                  <_Builtin.Block
                    className="user-topbar-connectivity-toggle"
                    tag="div"
                  >
                    {onlineSync ? (
                      <_Builtin.Image
                        className="icon-connectivity-sync"
                        loading="lazy"
                        width="auto"
                        height="auto"
                        alt=""
                        src="https://cdn.prod.website-files.com/655cae9c85d542976fbd4b10/680f7adbb98bdc020552a29b_icon-sync.svg"
                      />
                    ) : null}
                    {online ? (
                      <_Builtin.Image
                        className="icon-connectivity-online"
                        loading="lazy"
                        width="auto"
                        height="auto"
                        alt=""
                        src="https://cdn.prod.website-files.com/655cae9c85d542976fbd4b10/680f7adcd0dad68923e7484c_icon-online.svg"
                      />
                    ) : null}
                    {offline ? (
                      <_Builtin.Image
                        className="icon-connectivity-offline"
                        loading="lazy"
                        width="auto"
                        height="auto"
                        alt=""
                        src="https://cdn.prod.website-files.com/655cae9c85d542976fbd4b10/655f54b3e6277e3be843c635_icon-offline.svg"
                      />
                    ) : null}
                  </_Builtin.Block>
                </_Builtin.HFlex>
              </_Builtin.Block>
              <_Builtin.Block className="user-widget-div" tag="div">
                <_Builtin.Block className="widget-canvas" tag="div">
                  <_Builtin.HFlex className="widgets-grid" tag="div">
                    {content ?? (
                      <_Builtin.Block className="widget-pebble-div" tag="div">
                        <DataPentagon />
                      </_Builtin.Block>
                    )}
                  </_Builtin.HFlex>
                </_Builtin.Block>
              </_Builtin.Block>
              <_Builtin.Block className="user-statuslog-div" tag="div">
                <_Builtin.Block
                  className="user-sdk-component user-a-sdk"
                  tag="div"
                >
                  <_Builtin.Block className="component-label" tag="div">
                    {"SDK"}
                  </_Builtin.Block>
                  <_Builtin.Block className="user-sqlite-component" tag="div">
                    <_Builtin.Block className="component-label" tag="div">
                      {"SQLite"}
                    </_Builtin.Block>
                  </_Builtin.Block>
                </_Builtin.Block>
                <_Builtin.VFlex className="user-console" tag="div">
                  <_Builtin.Block
                    className="user-console-label-user-a user-a"
                    tag="div"
                  >
                    {"Console"}
                  </_Builtin.Block>
                  <_Builtin.Block className="user-statuslog-text" tag="div">
                    {logText}
                  </_Builtin.Block>
                </_Builtin.VFlex>
              </_Builtin.Block>
            </_Builtin.Block>
            <_Builtin.Block className="widget-controls-div" tag="div">
              <_Builtin.Block className="widget-control-buttons" tag="div">
                <_Builtin.Link
                  className="widget-button-user-a button-create widget-create-button-primary"
                  button={true}
                  block=""
                  options={{
                    href: "#",
                  }}
                  {...buttonCreate}
                >
                  {"Create"}
                </_Builtin.Link>
                <_Builtin.Link
                  className="widget-button-user-a button-update"
                  button={true}
                  block=""
                  options={{
                    href: "#",
                  }}
                  {...buttonUpdate}
                >
                  {"Update"}
                </_Builtin.Link>
                <_Builtin.Link
                  className="widget-button-user-a button-delete"
                  button={true}
                  block=""
                  options={{
                    href: "#",
                  }}
                  {...buttonDelete}
                >
                  {"Delete"}
                </_Builtin.Link>
              </_Builtin.Block>
            </_Builtin.Block>
          </_Builtin.VFlex>
          <_Builtin.VFlex className="user-a-io" tag="div">
            <_Builtin.Block className="user-a-writes" tag="div">
              <_Builtin.Block className="user-a-writes-div" tag="div">
                {writesFalse ? (
                  <_Builtin.Block className="user-a-writes-io" tag="div">
                    <_Builtin.Block className="user-a-writes-io-pill" tag="div">
                      <_Builtin.Block
                        className="user-a-writes-io-label"
                        tag="div"
                      >
                        {"uploads"}
                      </_Builtin.Block>
                    </_Builtin.Block>
                  </_Builtin.Block>
                ) : null}
              </_Builtin.Block>
              <_Builtin.Block className="user-a-write-path" tag="div">
                <_Builtin.HtmlEmbed
                  className="user-a-write-svg"
                  value="%3Csvg%20id%3D%22user-a-write-arrow%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%2024%22%3E%0A%3Cdefs%3E%0A%3Cstyle%3E%0A%3Aroot%20%7B%0A--animation-stroke-dasharray%3A%2012%3B%0A--animation-stroke-dashoffset%3A%20100%3B%0A%7D%0A.user-a-write-line%7Bfill%3Anone%3Bstroke%3Avar(--yellow)%3Bstroke-miterlimit%3A10%3Bstroke-width%3A2px%3Banimation%3Anone%202s%20linear%20infinite%20reverse%3B%7D%0A.line-animate%20%7B%0A%09stroke-dasharray%3A%20var(--animation-stroke-dasharray)%3B%0A%09stroke-dashoffset%3A%20var(--animation-stroke-dashoffset)%3B%0A%20%20animation-name%3A%20flow%3B%0A%7D%0A%40keyframes%20flow%20%7B%0A%20%20%20%20100%25%20%7B%0A%20%20%20%20%20%20%20%20stroke-dashoffset%3A%200%3B%0A%20%20%20%20%7D%0A%7D%0A.user-a-write-arrowhead%7Bfill%3Avar(--yellow)%3Bstroke-width%3A0px%3B%7D%0A%3C%2Fstyle%3E%0A%3C%2Fdefs%3E%0A%3Cline%20id%3D%22animate-arrows%22%20class%3D%22user-a-write-line%22%20x1%3D%22117.6%22%20y1%3D%2212%22%20y2%3D%2212%22%2F%3E%0A%3Cpath%20class%3D%22user-a-write-arrowhead%22%20d%3D%22M103.9%2C2.4c-.3.5-.2%2C1.1.3%2C1.4l12.9%2C8.2-12.9%2C8.2c-.5.3-.6.9-.3%2C1.4.3.5.9.6%2C1.4.3l14.2-9.1c.3-.2.5-.5.5-.8s-.2-.7-.5-.8l-14.2-9.1c-.2-.1-.4-.2-.5-.2-.3%2C0-.6.2-.8.5h-.1Z%22%2F%3E%0A%3C%2Fsvg%3E"
                  {...writePath}
                />
              </_Builtin.Block>
            </_Builtin.Block>
            <_Builtin.Block className="spacer-div" tag="div" />
            <_Builtin.Block className="user-a-reads" tag="div">
              <_Builtin.Block className="user-a-reads-div" tag="div">
                {readsFalse ? (
                  <_Builtin.Block className="user-a-reads-io" tag="div">
                    <_Builtin.Block className="user-a-reads-io-pill" tag="div">
                      <_Builtin.Block
                        className="user-a-reads-io-label"
                        tag="div"
                      >
                        {"downloads"}
                      </_Builtin.Block>
                    </_Builtin.Block>
                  </_Builtin.Block>
                ) : null}
              </_Builtin.Block>
              <_Builtin.Block className="user-a-read-path" tag="div">
                <_Builtin.HtmlEmbed
                  className="user-a-read-svg"
                  value="%3Csvg%20id%3D%22user-a-read-arrow%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%2024%22%3E%0A%3Cdefs%3E%0A%3Cstyle%3E%0A%3Aroot%20%7B%0A--animation-stroke-dasharray%3A%2012%3B%0A--animation-stroke-dashoffset%3A%20100%3B%0A%7D%0A.user-a-read-line%7Bfill%3Anone%3Bstroke%3Avar(--yellow)%3Bstroke-miterlimit%3A10%3Bstroke-width%3A2px%3Banimation%3Anone%202s%20linear%20infinite%20reverse%3B%7D%0A.line-animate%20%7B%0A%09stroke-dasharray%3A%20var(--animation-stroke-dasharray)%3B%0A%09stroke-dashoffset%3A%20var(--animation-stroke-dashoffset)%3B%0A%20%20animation-name%3A%20flow%3B%0A%7D%0A%40keyframes%20flow%20%7B%0A%20%20%20%20100%25%20%7B%0A%20%20%20%20%20%20%20%20stroke-dashoffset%3A%200%3B%0A%20%20%20%20%7D%0A%7D%0A.user-a-read-arrowhead%7Bfill%3Avar(--yellow)%3Bstroke-width%3A0px%3B%7D%0A%3C%2Fstyle%3E%0A%3C%2Fdefs%3E%0A%3Cline%20id%3D%22animate-arrows%22%20class%3D%22user-a-read-line%22%20x1%3D%222.4%22%20y1%3D%2212%22%20x2%3D%22120%22%20y2%3D%2212%22%2F%3E%0A%3Cpath%20class%3D%22user-a-read-arrowhead%22%20d%3D%22M16.1%2C21.6c.3-.5.2-1.1-.3-1.4L2.9%2C12%2C15.8%2C3.8c.5-.3.6-.9.3-1.4-.3-.5-.9-.6-1.4-.3L.5%2C11.2c-.3.2-.5.5-.5.8s.2.7.5.8l14.2%2C9.1c.2.1.4.2.5.2.3%2C0%2C.6-.2.8-.5Z%22%2F%3E%3C%2Fsvg%3E"
                  {...readPath}
                />
              </_Builtin.Block>
            </_Builtin.Block>
          </_Builtin.VFlex>
        </_Builtin.HFlex>
      )}
    </_Component>
  );
}
