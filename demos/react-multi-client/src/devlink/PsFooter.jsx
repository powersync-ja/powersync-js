import React from "react";
import * as _Builtin from "./_Builtin";

export function PsFooter({ as: _Component = _Builtin.Block }) {
  return (
    <_Component className="ps-footer-div" tag="div">
      <_Builtin.Section
        className="ps-footer"
        grid={{
          type: "section",
        }}
        tag="section"
      >
        <_Builtin.BlockContainer
          className="ps-footer-container"
          grid={{
            type: "container",
          }}
          tag="div"
        >
          <_Builtin.Row
            className="ps-footer-layout"
            tag="div"
            columns={{
              main: "6|3|3",
              medium: "",
              small: "4|4|4",
              tiny: "",
            }}
          >
            <_Builtin.Column className="ps-footer-column-logo" tag="div">
              <_Builtin.Image
                className="ps-footer-logo"
                loading="lazy"
                width="auto"
                height="auto"
                alt=""
                src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b9a_powersync-logo-color.svg"
              />
            </_Builtin.Column>
            <_Builtin.Column className="ps-footer-column-dev" tag="div">
              <_Builtin.Heading className="ps-footer-column-heading" tag="h6">
                {"Developers"}
              </_Builtin.Heading>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://docs.powersync.com/",
                  target: "_blank",
                }}
              >
                {"Docs"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://docs.powersync.com/quickstart-guide",
                  target: "_blank",
                }}
              >
                {"Quickstart Guide"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://docs.powersync.com/installation/sync-rules",
                  target: "_blank",
                }}
              >
                {"Sync Rules"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://docs.powersync.com/api-reference",
                  target: "_blank",
                }}
              >
                {"APIReference"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                }}
              >
                {"Open-Source Packages"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://releases.powersync.co/",
                  target: "_blank",
                }}
              >
                {"Release Notes"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://roadmap.powersync.com/",
                  target: "_blank",
                }}
              >
                {"Roadmap"}
              </_Builtin.Link>
            </_Builtin.Column>
            <_Builtin.Column className="ps-footer-column-about" tag="div">
              <_Builtin.Heading className="ps-footer-column-heading" tag="h6">
                {"About"}
              </_Builtin.Heading>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                }}
              >
                {"Blog"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                }}
              >
                {"Pricing"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                }}
              >
                {"Company"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "https://docs.powersync.co/resources/security",
                  target: "_blank",
                }}
              >
                {"Security"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                  target: "_blank",
                }}
              >
                {"Terms of Service"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                  target: "_blank",
                }}
              >
                {"Acceptable Use Policy"}
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-text-link"
                button={false}
                block=""
                options={{
                  href: "#",
                  target: "_blank",
                }}
              >
                {"Privacy Policy"}
              </_Builtin.Link>
            </_Builtin.Column>
          </_Builtin.Row>
          <_Builtin.Block className="ps-footer-fineprint-bottom" tag="div">
            <_Builtin.Block className="ps-footer-div-bottom-text" tag="div">
              {"© 2023 Journey Mobile, Inc."}
            </_Builtin.Block>
            <_Builtin.Block className="ps-footer-bottom-div-links" tag="div">
              <_Builtin.Link
                className="ps-footer-bottom-link"
                button={false}
                block="inline"
                options={{
                  href: "https://github.com/powersync-ja",
                  target: "_blank",
                }}
              >
                <_Builtin.Image
                  className="ps-footer-link-icon"
                  loading="lazy"
                  width="auto"
                  height="24"
                  alt=""
                  src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b48_github-white.svg"
                />
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-bottom-link"
                button={false}
                block="inline"
                options={{
                  href: "https://discord.gg/powersync",
                  target: "_blank",
                }}
              >
                <_Builtin.Image
                  className="ps-footer-link-icon"
                  loading="lazy"
                  width="auto"
                  height="24"
                  alt=""
                  src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b4d_discord-white.svg"
                />
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-bottom-link"
                button={false}
                block="inline"
                options={{
                  href: "https://twitter.com/powersync_",
                  target: "_blank",
                }}
              >
                <_Builtin.Image
                  className="ps-footer-link-icon"
                  loading="lazy"
                  width="auto"
                  height="20"
                  alt=""
                  src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4ba3_x-white.svg"
                />
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-bottom-link"
                button={false}
                block="inline"
                options={{
                  href: "https://www.youtube.com/@powersync_",
                  target: "_blank",
                }}
              >
                <_Builtin.Image
                  className="ps-footer-link-icon"
                  loading="lazy"
                  width="32"
                  height="24"
                  alt=""
                  src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4b80_youtube-white.svg"
                />
              </_Builtin.Link>
              <_Builtin.Link
                className="ps-footer-bottom-link"
                button={false}
                block="inline"
                options={{
                  href: "https://www.linkedin.com/showcase/journeyapps-powersync/",
                  target: "_blank",
                }}
              >
                <_Builtin.Image
                  className="ps-footer-link-icon"
                  loading="lazy"
                  width="auto"
                  height="24"
                  alt=""
                  src="https://uploads-ssl.webflow.com/655cae9c85d542976fbd4b10/655cae9c85d542976fbd4ba6_linkedin-icon-white.svg"
                />
              </_Builtin.Link>
            </_Builtin.Block>
          </_Builtin.Block>
        </_Builtin.BlockContainer>
      </_Builtin.Section>
      <_Builtin.Block className="ps-footer-div-bottom-banner" tag="div" />
    </_Component>
  );
}
