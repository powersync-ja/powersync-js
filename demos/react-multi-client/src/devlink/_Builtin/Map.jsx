import React, { useEffect, useRef } from "react";
import { cj, loadScript } from "../utils";
function buildTitle(title, tooltip) {
  let markerTitle = "Map pin";
  if (title && tooltip) {
    markerTitle = `Map pin on ${title} showing location of ${tooltip}`;
  } else if (title && !tooltip) {
    markerTitle = `Map pin on ${title}`;
  } else if (!title && tooltip) {
    markerTitle = `Map pin showing location of ${tooltip}`;
  }
  return markerTitle;
}
export const MapWidget = React.forwardRef(function MapWidget(
  {
    apiKey = "",
    mapStyle = "roadmap",
    zoom = 12,
    latlng = "51.511214,-0.119824",
    tooltip = "",
    title = "",
    enableScroll = true,
    enableTouch = true,
    className = "",
    ...props
  },
  ref
) {
  const mapRef = useRef(null);
  React.useImperativeHandle(ref, () => mapRef.current);
  useEffect(() => {
    const loadMap = () => {
      if (!mapRef.current) return;
      if (!window?.google?.maps) return;
      const { Map, Marker, InfoWindow } = window.google.maps;
      const coords = latlng.split(",");
      const center = { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
      const map = new Map(mapRef.current, {
        zoom,
        center,
        mapTypeId: mapStyle,
        mapTypeControl: false,
        panControl: false,
        streetViewControl: false,
        draggable: enableTouch,
        scrollwheel: enableScroll,
        zoomControl: true,
      });
      const marker = new Marker({
        draggable: false,
        position: center,
        title: buildTitle(title, tooltip),
        map,
      });
      if (tooltip) {
        new InfoWindow({
          disableAutoPan: true,
          content: tooltip,
          position: center,
        }).open({ anchor: marker, map });
      }
      window.google.maps.event.addListener(marker, "click", function () {
        window.open(`https://maps.google.com/?z=${zoom}&daddr=${latlng}`);
      });
    };
    loadScript(
      `https://maps.googleapis.com/maps/api/js?v=3.52.5&key=${apiKey}`,
      {
        cacheRegex: /maps\.googleapis\.com\/maps\/api\/js\?v=3\.52\.5\&key=/gi,
      }
    ).then(loadMap);
  }, [
    apiKey,
    mapStyle,
    zoom,
    latlng,
    tooltip,
    title,
    enableScroll,
    enableTouch,
    mapRef,
  ]);
  return (
    <div
      {...props}
      className={cj(className, "w-widget w-widget-map")}
      role="region"
      ref={mapRef}
    />
  );
});
