import React from 'react';
import { BAEK, WARM_CREAM } from '../../../theme/colors';

/**
 * HangeulAccents - Decorative Korean characters scattered throughout the composition.
 *
 * Includes large watermark text, subtitle translations, and scattered single-character
 * texture elements at very low opacity.
 */

interface FloatingCharProps {
  char: string;
  top: string;
  left: string;
  fontSize: string;
  opacity: number;
  color?: string;
  writingMode?: 'vertical-rl' | 'horizontal-tb';
  letterSpacing?: string;
  fontWeight?: number;
  textAlign?: 'center' | 'left' | 'right';
  transform?: string;
}

const FloatingChar: React.FC<FloatingCharProps> = ({
  char,
  top,
  left,
  fontSize,
  opacity,
  color = WARM_CREAM,
  writingMode = 'horizontal-tb',
  letterSpacing,
  fontWeight = 400,
  textAlign,
  transform,
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      fontSize,
      opacity,
      color,
      fontFamily: "'Noto Serif KR', serif",
      fontWeight,
      writingMode,
      letterSpacing,
      textAlign,
      transform,
      pointerEvents: 'none',
      userSelect: 'none',
      lineHeight: 1.4,
    }}
  >
    {char}
  </div>
);

interface HangeulAccentsProps {
  /** Draw the two pieces of title-stack text — the "몸에서 몸으로" subtitle and
   *  the "방탄소년단" badge. They belong with <TitleTreatment/>, so anything
   *  that turns the title card off (the 2.3 reverse, which lands back on this
   *  same landscape 43 seconds in) has to turn these off too, or the frame
   *  reads as a title with its middle line missing. The 아리랑 watermark is
   *  part of the painting and always stays. */
  showTitleText?: boolean
}

const HangeulAccents: React.FC<HangeulAccentsProps> = ({ showTitleText = true }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* 1. "아리랑" (Arirang) - large vertical watermark on left side */}
      <FloatingChar
        char="아리랑"
        top="10%"
        left="5%"
        fontSize="8vw"
        opacity={0.08}
        color={BAEK}
        writingMode="vertical-rl"
        fontWeight={900}
      />

      {/* 2. "몸에서 몸으로" (Body to Body in Korean) - subtitle below English title */}
      {showTitleText && <FloatingChar
        char="몸에서 몸으로"
        top="26%"
        left="50%"
        fontSize="1.8vw"
        opacity={0.7}
        color={WARM_CREAM}
        letterSpacing="0.3em"
        fontWeight={400}
        transform="translateX(-50%)"
        textAlign="center"
      />}

      {/* 3. "방탄소년단" (Bangtan Sonyeondan) - tiny text below BTS badge */}
      {showTitleText && <FloatingChar
        char="방탄소년단"
        top="14%"
        left="50%"
        fontSize="0.8vw"
        opacity={0.4}
        color={WARM_CREAM}
        letterSpacing="0.5em"
        fontWeight={400}
        transform="translateX(-50%)"
        textAlign="center"
      />}

      {/* 4. Scattered single characters as texture elements */}

      {/* "달" (moon) - near the moon area, upper right */}
      <FloatingChar
        char="달"
        top="15%"
        left="78%"
        fontSize="3vw"
        opacity={0.06}
        color={WARM_CREAM}
        fontWeight={900}
      />

      {/* "학" (crane) - mid area */}
      <FloatingChar
        char="학"
        top="45%"
        left="72%"
        fontSize="2.5vw"
        opacity={0.05}
        color={WARM_CREAM}
        fontWeight={900}
      />

      {/* "꽃" (flower) - lower area */}
      <FloatingChar
        char="꽃"
        top="62%"
        left="18%"
        fontSize="2vw"
        opacity={0.05}
        color={WARM_CREAM}
        fontWeight={900}
      />

      {/* "산" (mountain) - near mountains */}
      <FloatingChar
        char="산"
        top="55%"
        left="40%"
        fontSize="3vw"
        opacity={0.06}
        color={WARM_CREAM}
        fontWeight={900}
      />

      {/* "물" (water) - near waves, lower area */}
      <FloatingChar
        char="물"
        top="72%"
        left="60%"
        fontSize="2vw"
        opacity={0.05}
        color={WARM_CREAM}
        fontWeight={900}
      />
    </div>
  );
};

export default HangeulAccents;
