import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export function enter(index = 0) {
  return FadeInDown.duration(420).delay(Math.min(index, 16) * 70);
}

export function enterSoft(index = 0) {
  return FadeIn.duration(280).delay(Math.min(index, 8) * 35);
}

export const enterFade = FadeIn.duration(200);

export { Animated };
