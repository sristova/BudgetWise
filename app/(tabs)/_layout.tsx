import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#070508',
          borderTopColor: '#251018',
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#A0263A',
        tabBarInactiveTintColor: '#3A1820',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Domov', tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transakcije', tabBarIcon: ({ color, size }) => <TabIcon name="list" color={color} size={size} /> }} />
      <Tabs.Screen name="goals" options={{ title: 'Cilji', tabBarIcon: ({ color, size }) => <TabIcon name="flag" color={color} size={size} /> }} />
      <Tabs.Screen name="assistant" options={{ title: 'Asistent', tabBarIcon: ({ color, size }) => <TabIcon name="chatbubble-ellipses" color={color} size={size} /> }} />
      <Tabs.Screen name="report" options={{ title: 'Poročilo', tabBarIcon: ({ color, size }) => <TabIcon name="bar-chart" color={color} size={size} /> }} />
    </Tabs>
  );
}