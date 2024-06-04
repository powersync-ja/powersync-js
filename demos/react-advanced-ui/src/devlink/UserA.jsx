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
                        src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f54b39092ef46920edbfb_icon-sync.svg"
                      />
                    ) : null}
                    {online ? (
                      <_Builtin.Image
                        className="icon-connectivity-online"
                        loading="lazy"
                        width="auto"
                        height="auto"
                        alt=""
                        src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f54b3969fccde5401be3a_icon-online.svg"
                      />
                    ) : null}
                    {offline ? (
                      <_Builtin.Image
                        className="icon-connectivity-offline"
                        loading="lazy"
                        width="auto"
                        height="auto"
                        alt=""
                        src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655f54b3e6277e3be843c635_icon-offline.svg"
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
                  value="%3Csvg%20id%3D%22user-a-write-arrow%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20168%2024%22%3E%0A%3Cdefs%3E%0A%3Cstyle%3E%0A%3Aroot%20%7B%0A--animation-stroke-dasharray%3A%2012%3B%0A--animation-stroke-dashoffset%3A%20100%3B%0A%7D%0A.user-a-write-line%7Bfill%3Anone%3Bstroke%3Avar(--user-orange)%3Bstroke-miterlimit%3A10%3Bstroke-width%3A2px%3Banimation%3Anone%202s%20linear%20infinite%20reverse%3B%7D%0A.line-animate%20%7B%0A%09stroke-dasharray%3A%20var(--animation-stroke-dasharray)%3B%0A%09stroke-dashoffset%3A%20var(--animation-stroke-dashoffset)%3B%0A%20%20animation-name%3A%20flow%3B%0A%7D%0A%40keyframes%20flow%20%7B%0A%20%20%20%20100%25%20%7B%0A%20%20%20%20%20%20%20%20stroke-dashoffset%3A%200%3B%0A%20%20%20%20%7D%0A%7D%0A.user-a-write-arrowhead%7Bfill%3Avar(--user-orange)%3Bstroke-width%3A0px%3B%7D%0A%3C%2Fstyle%3E%0A%3C%2Fdefs%3E%0A%3Cline%20id%3D%22animate-arrows%22%20class%3D%22user-a-write-line%22%20x1%3D%22165.6%22%20y1%3D%2212%22%20y2%3D%2212%22%2F%3E%0A%3Cpath%20class%3D%22user-a-write-arrowhead%22%20d%3D%22m151.93%2C2.4c-.3.46-.16%2C1.08.31%2C1.38l12.91%2C8.22-12.91%2C8.22c-.47.3-.6.92-.31%2C1.38.3.46.92.6%2C1.38.31l14.23-9.06c.29-.18.46-.5.46-.84s-.17-.66-.46-.84l-14.23-9.06c-.17-.11-.35-.16-.54-.16-.33%2C0-.65.16-.84.46Z%22%2F%3E%0A%3C%2Fsvg%3E"
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
                  value="%3Csvg%20id%3D%22user-a-read-arrow%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20168%2024%22%3E%0A%3Cdefs%3E%0A%3Cstyle%3E%0A%3Aroot%20%7B%0A--animation-stroke-dasharray%3A%2012%3B%0A--animation-stroke-dashoffset%3A%20100%3B%0A%7D%0A.user-a-read-line%7Bfill%3Anone%3Bstroke%3Avar(--user-orange)%3Bstroke-miterlimit%3A10%3Bstroke-width%3A2px%3Banimation%3Anone%202s%20linear%20infinite%20reverse%3B%7D%0A.line-animate%20%7B%0A%09stroke-dasharray%3A%20var(--animation-stroke-dasharray)%3B%0A%09stroke-dashoffset%3A%20var(--animation-stroke-dashoffset)%3B%0A%20%20animation-name%3A%20flow%3B%0A%7D%0A%40keyframes%20flow%20%7B%0A%20%20%20%20100%25%20%7B%0A%20%20%20%20%20%20%20%20stroke-dashoffset%3A%200%3B%0A%20%20%20%20%7D%0A%7D%0A.user-a-read-arrowhead%7Bfill%3Avar(--user-orange)%3Bstroke-width%3A0px%3B%7D%0A%3C%2Fstyle%3E%0A%3C%2Fdefs%3E%0A%3Cline%20id%3D%22animate-arrows%22%20class%3D%22user-a-read-line%22%20x1%3D%222.4%22%20y1%3D%2212%22%20x2%3D%22168%22%20y2%3D%2212%22%2F%3E%0A%3Cpath%20class%3D%22user-a-read-arrowhead%22%20d%3D%22m16.07%2C21.6c.3-.46.16-1.08-.31-1.38L2.86%2C12%2C15.77%2C3.78c.47-.3.6-.92.31-1.38-.3-.46-.92-.6-1.38-.31L.46%2C11.16c-.29.18-.46.5-.46.84s.17.66.46.84l14.23%2C9.06c.17.11.35.16.54.16.33%2C0%2C.65-.16.84-.46Z%22%2F%3E%3C%2Fsvg%3E"
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
