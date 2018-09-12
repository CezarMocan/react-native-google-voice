/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import GoogleVoice from './GoogleVoice'

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};

const TEST_API_KEY = 'AIzaSyD-o08CQL91vezbKziBXYn9BuC7tL9wrMk'

export default class App extends Component<Props> {
  constructor(props) {
    super(props)
    GoogleVoice.onSpeechStart = this.onSpeechStart.bind(this)
    GoogleVoice.onSpeechEnd = this.onSpeechEnd.bind(this)
    GoogleVoice.onSpeechError = this.onSpeechError.bind(this)
    GoogleVoice.onSpeechResults = this.onSpeechResults.bind(this)
    GoogleVoice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this)

    this.onPressStart = this.onPressStart.bind(this)
    this.onPressStop = this.onPressStop.bind(this)
  }

  onSpeechStart(e) {
    console.log('onSpeechStart', e)
  }

  onSpeechEnd(e) {
    console.log('onSpeechEnd', e)
  }

  onSpeechResults(e) {
    console.log('onSpeechResults', e)
  }

  onSpeechPartialResults(e) {
    console.log('onSpeechPartial', e)
  }

  onPressStart() {
    await GoogleVoice.start()
  }

  onPressStop() {
    await GoogleVoice.stop()
  }

  async componentDidMount() {
    await GoogleVoice.initialize({
      locale: 'en-US',
      apiKey: TEST_API_KEY,
      alternatives: 5
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.onPressStart}><Text>Start listening</Text></TouchableOpacity>
        <TouchableOpacity><Text>Stop listening</Text></TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 25
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
