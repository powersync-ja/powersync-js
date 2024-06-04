import React from "react";
import * as _Builtin from "./_Builtin";

export function PsNavbarMobile({ as: _Component = _Builtin.NavbarWrapper }) {
  return (
    <_Component
      className="ps-navbar visible-sm"
      tag="div"
      config={{
        animation: "default",
        collapse: "medium",
        docHeight: true,
        duration: 400,
        easing: "ease",
        easing2: "ease",
        noScroll: false,
      }}
    >
      <_Builtin.NavbarContainer className="ps-container-navbar" tag="div">
        <_Builtin.NavbarBrand
          className="ps-nav-logo"
          options={{
            href: "#",
          }}
        >
          <_Builtin.Image
            className="ps-logo"
            width="auto"
            height="auto"
            loading="lazy"
            alt=""
            src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b49_powersync-logo-horizontal-all-white.svg"
          />
        </_Builtin.NavbarBrand>
        <_Builtin.NavbarMenu
          className="ps-nav-menu-center"
          tag="nav"
          role="navigation"
        >
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "https://docs.powersync.co/",
              target: "_blank",
            }}
          >
            {"Docs"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "#",
            }}
          >
            {"Open-Source"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "#",
            }}
          >
            {"Blog"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "#",
            }}
          >
            {"Pricing"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link plausible-event-name--get-started"
            id="button-click-get-started"
            options={{
              href: "https://accounts.journeyapps.com/portal/free-trial?powersync=true",
              target: "_blank",
            }}
          >
            {"Get started"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "https://github.com/powersync-ja",
              target: "_blank",
            }}
          >
            {"GitHub"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "#",
              target: "_blank",
            }}
          >
            {"Discord"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "https://twitter.com/powersync_",
              target: "_blank",
            }}
          >
            {"Twitter"}
          </_Builtin.NavbarLink>
          <_Builtin.NavbarLink
            className="ps-nav-link"
            options={{
              href: "https://www.youtube.com/channel/UCSDdZvrZuizmc2EMBuTs2Qg",
              target: "_blank",
            }}
          >
            {"YouTube"}
          </_Builtin.NavbarLink>
        </_Builtin.NavbarMenu>
        <_Builtin.NavbarButton className="menu-button" tag="div">
          <_Builtin.Icon
            widget={{
              type: "icon",
              icon: "nav-menu",
            }}
          />
        </_Builtin.NavbarButton>
      </_Builtin.NavbarContainer>
    </_Component>
  );
}
