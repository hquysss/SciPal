import { Text, View } from 'react-native';
import { getAccentColor } from '@scipal/ui';

export default function HomeScreen() {
  const accent = getAccentColor('informatics');
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text style={{ color: accent }} className="text-2xl font-semibold">
        SciPal Mobile — Foundation ✓
      </Text>
    </View>
  );
}
