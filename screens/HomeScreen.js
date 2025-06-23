// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';

// export default function HomeScreen() {
//   return (
//     <View style={styles.container}>
//       <Text>Inicio</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });
// screens/HomeScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Audio } from 'expo-av';

export default function HomeScreen() {
  const [recording, setRecording] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const response = await Audio.requestPermissionsAsync();
      setHasPermission(response.granted);
    })();
  }, []);

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        console.warn('No tienes permisos para grabar');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setRecording(recording);
      console.log('Grabando...');
    } catch (err) {
      console.error('Error al iniciar la grabación', err);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Grabación guardada en:', uri);
      setRecording(null);
    } catch (err) {
      console.error('Error al detener la grabación', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>¡Hola! Dictame lo que quieras:</Text>

      <TouchableOpacity
        style={styles.circularButton}
        onPress={recording ? stopRecording : startRecording}
      >
        <Image
          source={
            recording
              ? require('../assets/stop.png')
              : require('../assets/mic.png')
          }
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginBottom: 20,
    fontSize: 16,
  },
  circularButton: {
    backgroundColor: '#D0D4D7',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});
