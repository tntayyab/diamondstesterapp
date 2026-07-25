import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { DrawerProvider } from "@/components/DrawerContext";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <DrawerProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Scan",
            tabBarIcon: ({ color, size }) => <Feather name="camera" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="species"
          options={{
            title: "Learn",
            tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="blog"
          options={{
            title: "Guides",
            tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          }}
        />
      </Tabs>
    </DrawerProvider>
  );
}
