import { Text, View } from 'react-native';

export function BackGlyph({ color }: { color: string }) {
  return (
    <Text style={{ color, fontSize: 28, fontWeight: '500', lineHeight: 30, marginTop: -2 }}>‹</Text>
  );
}

export function CameraGlyph({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.72,
        borderRadius: 6,
        borderWidth: 2.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: size,
          borderWidth: 2.5,
          borderColor: color,
        }}
      />
    </View>
  );
}

export function GalleryGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 18, borderWidth: 2, borderColor: color, borderRadius: 3 }}>
      <View
        style={{
          position: 'absolute',
          right: -5,
          top: -5,
          width: 22,
          height: 18,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 3,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

export function ArrowDownGlyph({ color }: { color: string }) {
  return <Text style={{ color, fontSize: 28, fontWeight: '600' }}>↓</Text>;
}
