import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type ShopLingerProps = {
  storeId: string;
  shopName: string;
  startEpochMs: number;
  pingEpochMs: number;
  ready: boolean;
};

const ShopLingerLayout = (props: ShopLingerProps, _environment: LiveActivityEnvironment) => {
  'widget';
  const cream = '#F3EEE4';
  const start = new Date(props.startEpochMs);
  const ping = new Date(props.pingEpochMs);
  const title = props.ready ? 'Scan a label' : 'Near a shop';
  const timer = props.ready ? (
    <Text modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle(cream)]}>Scan</Text>
  ) : (
    <Text
      timerInterval={{ lower: start, upper: ping }}
      countsDown
      modifiers={[
        font({ weight: 'bold', size: 18 }),
        monospacedDigit(),
        foregroundStyle(cream),
        frame({ width: 64 }),
      ]}
    />
  );

  return {
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(cream)]}>{title}</Text>
        <Text modifiers={[foregroundStyle(cream)]}>{props.shopName}</Text>
        {timer}
      </VStack>
    ),
    compactLeading: <Image systemName="cart.fill" color={cream} />,
    compactTrailing: timer,
    minimal: <Image systemName="cart.fill" color={cream} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName="cart.fill" color={cream} size={22} />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(cream)]}>Crump</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ all: 8 })]}>{timer}</VStack>,
    expandedBottom: (
      <Text modifiers={[padding({ all: 8 }), foregroundStyle(cream)]}>
        {props.ready ? 'Tap to open the scanner' : props.shopName}
      </Text>
    ),
  };
};

export default createLiveActivity('ShopLinger', ShopLingerLayout);
