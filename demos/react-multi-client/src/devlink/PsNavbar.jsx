import React from "react";
import * as _Builtin from "./_Builtin";

export function PsNavbar({ as: _Component = _Builtin.NavbarWrapper }) {
  return (
    <_Component
      className="ps-navbar visible-lg"
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
      <_Builtin.NavbarContainer className="ps-container-navbar" tag="header">
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
        <_Builtin.Block className="ps-nav-links-div w-clearfix" tag="div">
          <_Builtin.NavbarMenu
            className="ps-nav-menu-center"
            tag="nav"
            role="navigation"
          >
            <_Builtin.NavbarLink
              className="ps-nav-link plausible-event-name--button-click-docs"
              id="button-click-docs"
              options={{
                href: "https://docs.powersync.com/",
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
          </_Builtin.NavbarMenu>
          <_Builtin.NavbarMenu
            className="ps-nav-menu-right"
            tag="nav"
            role="navigation"
          >
            <_Builtin.Link
              className="ps-nav-link-devcom"
              button={false}
              block="inline"
              options={{
                href: "https://github.com/powersync-ja",
                target: "_blank",
              }}
            >
              <_Builtin.Image
                className="ps-nav-link-icon"
                width="auto"
                height="24"
                loading="lazy"
                alt=""
                src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b48_github-white.svg"
              />
            </_Builtin.Link>
            <_Builtin.Link
              className="ps-nav-link-devcom"
              button={false}
              block="inline"
              options={{
                href: "https://discord.gg/powersync",
                target: "_blank",
              }}
            >
              <_Builtin.Image
                className="ps-nav-link-icon"
                width="auto"
                height="24"
                loading="lazy"
                alt=""
                src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b4d_discord-white.svg"
              />
            </_Builtin.Link>
            <_Builtin.Link
              className="ps-nav-link-devcom"
              button={false}
              block="inline"
              options={{
                href: "https://twitter.com/powersync_",
                target: "_blank",
              }}
            >
              <_Builtin.Image
                className="ps-nav-link-icon"
                width="auto"
                height="20"
                loading="lazy"
                alt=""
                src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4bc1_x-white.svg"
              />
            </_Builtin.Link>
            <_Builtin.Link
              className="ps-nav-link-devcom"
              button={false}
              block="inline"
              options={{
                href: "https://www.youtube.com/@powersync_",
                target: "_blank",
              }}
            >
              <_Builtin.Image
                className="ps-nav-link-icon"
                width="32"
                height="24"
                loading="lazy"
                alt=""
                src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b80_youtube-white.svg"
              />
            </_Builtin.Link>
            <_Builtin.NavbarLink
              className="ps-nav-link ps-nav-button ps-nav-sign-in-button plausible-event-name--button-click-sign-in"
              id="button-click-sign-in"
              options={{
                href: "https://powersync.journeyapps.com/",
              }}
            >
              {"Sign in"}
            </_Builtin.NavbarLink>
            <_Builtin.NavbarLink
              className="ps-nav-link ps-nav-button plausible-event-name--button-click-get-started"
              id="button-click-get-started"
              options={{
                href: "https://accounts.journeyapps.com/portal/free-trial?powersync=true",
              }}
            >
              {"Get started"}
            </_Builtin.NavbarLink>
          </_Builtin.NavbarMenu>
        </_Builtin.Block>
        <_Builtin.NavbarButton className="menu-button" tag="div">
          <_Builtin.Icon
            className="icon"
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
