import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export default function HomeScreen() {
  const [recording, setRecording] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Opciones de grabación en formato .m4a
  const recordingOptions = {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/m4a',
    },
  };

  useEffect(() => {
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermission(granted);
    })();
  }, []);

  const startRecording = async () => {
    if (!hasPermission) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
    } catch (err) {
      console.error('Error al iniciar grabación', err);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      await sendAudioToBackend(uri);
    } catch (err) {
      console.error('Error al detener grabación', err);
    }
  };

  const sendAudioToBackend = async (uri) => {
    const formData = new FormData();

    const filename = `recording_${Date.now()}.m4a`;

    formData.append('audio', {
      uri,
      name: filename,
      type: 'audio/m4a',
    });


    // formData.append('audio', {
    //   uri,
    //   name: 'audio.m4a',
    //   type: 'audio/m4a',
    // });

    try {
      const response = await fetch('http://192.168.23.99:3000/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (data.text) setTranscript(data.text);
    } catch (error) {
      console.error('Error al enviar el audio:', error);
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

      <TextInput
        style={styles.input}
        placeholder="Presiona el botón de grabar primero..."
        placeholderTextColor="#999"
        multiline
        value={transcript}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  text: {
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  circularButton: {
    backgroundColor: '#D0D4D7',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  input: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#333',
    elevation: 3,
    textAlignVertical: 'top',
  },
});
