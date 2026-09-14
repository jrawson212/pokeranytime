import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

function siteUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv;

  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host =
    hostUri.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1] ?? hostUri.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }
  return "http://10.0.0.46:3000";
}

function safeAreaScript() {
  const top = Constants.statusBarHeight ?? 0;
  const bottom = Platform.OS === "ios" && top >= 44 ? 34 : 0;
  return `(function(){
    var s = document.documentElement.style;
    s.setProperty('--app-safe-top', '${top}px');
    s.setProperty('--app-safe-bottom', '${bottom}px');
  })();
  true;`;
}

export default function App() {
  const uri = useMemo(siteUrl, []);
  const [failed, setFailed] = useState<string | null>(null);
  const insetScript = useMemo(safeAreaScript, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {failed ? (
        <View style={styles.loading}>
          <Text style={styles.hint}>Could not open the table</Text>
          <Text style={styles.sub}>{failed}</Text>
          <Text style={styles.sub}>
            Same Wi-Fi. Keep npm run dev, npx convex dev, and npm run
            dev:phone running. Try {uri} in Safari if Expo Go blocks HTTP.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          style={styles.webview}
          originWhitelist={["*"]}
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          injectedJavaScriptBeforeContentLoaded={insetScript}
          startInLoadingState
          onError={(event) =>
            setFailed(event.nativeEvent.description || "WebView failed to load")
          }
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400) {
              setFailed(`HTTP ${event.nativeEvent.statusCode} from ${uri}`);
            }
          }}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color="#e4c56a" size="large" />
              <Text style={styles.hint}>Opening {uri}</Text>
              <Text style={styles.sub}>
                Same Wi-Fi as your computer. Keep npm run dev running.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#06291f",
  },
  webview: {
    flex: 1,
    backgroundColor: "#06291f",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06291f",
    gap: 12,
    padding: 24,
  },
  hint: {
    color: "#f4ead5",
    fontSize: 16,
    textAlign: "center",
  },
  sub: {
    color: "#8fb9a8",
    fontSize: 13,
    textAlign: "center",
  },
});
