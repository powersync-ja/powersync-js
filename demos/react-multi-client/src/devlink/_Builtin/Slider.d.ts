import * as React from "react";
import { EASING_FUNCTIONS } from "../utils";
type SliderConfig = {
  navSpacing: number;
  navShadow: boolean;
  autoplay: boolean;
  delay: number;
  iconArrows: boolean;
  animation: "slide" | "cross" | "outin" | "fade" | "over";
  navNumbers: boolean;
  easing: keyof typeof EASING_FUNCTIONS;
  navRound: boolean;
  hideArrows: boolean;
  disableSwipe: boolean;
  duration: number;
  infinite: boolean;
  autoMax: number;
  navInvert: boolean;
};
type SlideState = {
  current: number;
  previous: number;
};
export declare const SliderContext: React.Context<
  SliderConfig & {
    slideAmount: number;
    setSlideAmount: React.Dispatch<React.SetStateAction<number>>;
    slide: SlideState;
    setCurrentSlide: (current: number) => void;
    goToNextSlide: () => void;
    goToPreviousSlide: () => void;
    isAutoplayPaused: boolean;
    setAutoplayPause: React.Dispatch<React.SetStateAction<boolean>>;
  }
>;
type SliderChildrenType =
  | SliderSlideProps
  | SliderArrowProps
  | SliderNavProps
  | SliderMaskProps;
export declare const SliderWrapper: React.ForwardRefExoticComponent<
  SliderConfig & {
    className?: string;
    children?:
      | React.ReactElement<SliderChildrenType>[]
      | React.ReactElement<SliderChildrenType>;
  } & React.RefAttributes<HTMLDivElement>
>;
type SliderMaskProps = React.PropsWithChildren<{
  className?: string;
}>;
export declare const SliderMask: React.ForwardRefExoticComponent<
  {
    className?: string;
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLDivElement>
>;
type SliderSlideProps = React.PropsWithChildren<{
  style?: React.CSSProperties;
  tag?: string;
  className?: string;
  index: number;
}>;
export declare const SliderSlide: React.ForwardRefExoticComponent<
  {
    style?: React.CSSProperties;
    tag?: string;
    className?: string;
    index: number;
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<unknown>
>;
type SliderArrowProps = React.PropsWithChildren<{
  className?: string;
  dir: "left" | "right";
}>;
export declare const SliderArrow: React.ForwardRefExoticComponent<
  {
    className?: string;
    dir: "left" | "right";
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLDivElement>
>;
type SliderNavProps = {
  className?: string;
};
export declare const SliderNav: React.ForwardRefExoticComponent<
  SliderNavProps & React.RefAttributes<HTMLDivElement>
>;
export {};
