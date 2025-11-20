import React from 'react';
import { View } from 'react-native';
import { Image } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const FeatheredImage = ({ source, style, resizeMode = 'contain', featherAmount = 0.15 }) => {
  const width = style?.width || 350;
  const height = style?.height || 350;

  return (
    <MaskedView
      style={[style, { overflow: 'hidden' }]}
      maskElement={
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="featherGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="white" stopOpacity="1" />
              <Stop offset={`${(1 - featherAmount) * 100}%`} stopColor="white" stopOpacity="1" />
              <Stop offset="100%" stopColor="white" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#featherGradient)"
          />
        </Svg>
      }
    >
      <Image
        source={source}
        style={[style, { width, height }]}
        resizeMode={resizeMode}
      />
    </MaskedView>
  );
};

export default FeatheredImage;
