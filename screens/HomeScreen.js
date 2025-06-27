import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import DropDownPicker from 'react-native-dropdown-picker';

export default function HomeScreen() {
  const [recording, setRecording] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [translateMode, setTranslateMode] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Dropdown states
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Inglés', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Alemán', value: 'de' },
    { label: 'Francés', value: 'fr' },
  ]);

  useEffect(() => {
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermission(granted);
    })();
  }, []);

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

    setLoading(true);
    startLoadingAnimation();

    try {
      const response = await fetch(
        `http://192.168.23.172:3000/transcribe${translateMode ? '?translate=true&targetLanguage=' + targetLanguage : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (translateMode) {
        setTranscript(data.original || '');
        setTranslation(data.text || '');
        setDetectedLanguage(data.language || '');
      } else {
        setTranscript(data.text || '');
        setTranslation('');
        setDetectedLanguage('');
      }
    } catch (error) {
      console.error('Error al enviar el audio:', error);
    } finally {
      stopLoadingAnimation();
      setLoading(false);
    }
  };

  const startLoadingAnimation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopLoadingAnimation = () => {
    rotateAnim.stopAnimation();
  };

  const getRingColor = () => {
    return translateMode ? 'limegreen' : '#2196F3';
  };

  const getCurrentRingStyle = () => {
    if (recording) {
      return {
        borderColor: 'red',
        transform: [{ rotate: '0deg' }],
      };
    }

    if (loading) {
      return {
        borderColor: getRingColor(),
        transform: [
          {
            rotate: rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          },
        ],
      };
    }

    return { display: 'none' };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>¡Hola! Dictame lo que quieras:</Text>

      <View style={styles.buttonContainer}>
        <Animated.View style={[styles.loadingRing, getCurrentRingStyle()]} />
        <TouchableOpacity
          style={styles.circularButton}
          onPress={recording ? stopRecording : startRecording}
          disabled={loading}
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

      <TouchableOpacity
        style={[styles.toggleButton, translateMode && styles.toggleActive]}
        onPress={() => setTranslateMode(!translateMode)}
        disabled={loading}
      >
        <Image
          source={require('../assets/translate.png')}
          style={styles.icon}
        />
        <Text style={styles.toggleText}>
          {translateMode ? 'Modo traducción activado' : 'Activar traducción'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Transcripción..."
        placeholderTextColor="#999"
        multiline
        value={transcript}
      />

      {translateMode && (
        <>
          <Text style={styles.detected}>
            Idioma detectado: {detectedLanguage || '...'}
          </Text>

          <DropDownPicker
            open={open}
            value={targetLanguage}
            items={items}
            setOpen={setOpen}
            setValue={setTargetLanguage}
            setItems={setItems}
            placeholder="Selecciona idioma de destino"
            containerStyle={{ width: '100%', marginBottom: 16 }}
            style={{ borderColor: '#ccc' }}
            dropDownContainerStyle={{ backgroundColor: '#fff' }}
            disabled={loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Traducción..."
            placeholderTextColor="#999"
            multiline
            value={translation}
          />
        </>
      )}
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
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  circularButton: {
    backgroundColor: '#D0D4D7',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderTopColor: 'transparent',
    zIndex: 1,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleActive: {
    backgroundColor: '#B3E5FC',
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  input: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#333',
    elevation: 3,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  detected: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
});
